import React, { useEffect, useMemo, useState } from 'react'
import {
  DIRECTORY_FLOW_HOLES, DIRECTORY_FLOW_PRIORITY, INCOMPATIBLE_PACKAGES, PLUGIN_ID,
} from '../shared/types.ts'
import { NewWorkspaceDialog } from './dialog.tsx'
import type { DirectoryListing } from './browse.tsx'
import { ensureStyles } from './styles.ts'
import { normalizeWorkspaces } from './workspaces.ts'

export const inject = ['slots', 'uiWorkspace', 'locale', 'remote']
export const name = PLUGIN_ID

interface DirectoryFlowProps {
  open: boolean
  busy: boolean
  onPicked: (path: string) => void
  onCancel: () => void
  onError: (message: string) => void
  useWorkspaces?: (select: (snapshot: unknown) => unknown) => unknown
}

interface SlotEntry {
  registrant?: string
  options?: { priority?: number; id?: string; name?: string }
  priority?: number
}

interface PluginInventoryItem {
  moduleName?: string
  name?: string
  packageName?: string
  entryId?: string
  id?: string
}

interface ClientContext {
  slots: {
    inject(name: string, register: () => (() => void) | Generator<() => void>): () => void
    register(def: Record<string, unknown>, component: (props: DirectoryFlowProps) => React.ReactElement | null): () => void
    entries?(key: string): readonly SlotEntry[]
  }
  uiWorkspace?: {
    listDirectory?(path?: string, signal?: AbortSignal): Promise<DirectoryListing>
    createDirectory?(path: string, name: string): Promise<string>
    pickDirectory?(signal?: AbortSignal): Promise<string | null>
  }
  remote?: {
    workspace?: { rename?(request: Record<string, unknown>): Promise<unknown> }
    directoryPicker?: {
      list?(path?: string, signal?: AbortSignal): Promise<DirectoryListing>
      createDirectory?(path: string, name: string): Promise<string>
      pick?(signal?: AbortSignal): Promise<string | null>
    }
    pluginInventory?: { list?: () => Promise<{ entries?: PluginInventoryItem[] } | PluginInventoryItem[]> }
  }
  effect?(callback: () => void | (() => void), label?: string): void
  inject?(names: string[], fn: (ctx: ClientContext) => void): void
}

interface ConflictState { labels: string[]; unknown: boolean }

let pluginContext: ClientContext | null = null

export function apply(ctx: ClientContext): void {
  pluginContext = ctx
  ensureStyles()
  const register = () => {
    ctx.slots.inject('conversation.hero.workspace.directoryFlow', () =>
      ctx.slots.inject('sidebar.workspaces.directoryFlow', function* () {
        yield ctx.slots.register({
          name: 'conversation.hero.workspace.directoryFlow',
          priority: DIRECTORY_FLOW_PRIORITY,
          registrant: PLUGIN_ID,
        }, DirectoryFlow)
        yield ctx.slots.register({
          name: 'sidebar.workspaces.directoryFlow',
          priority: DIRECTORY_FLOW_PRIORITY,
          registrant: PLUGIN_ID,
        }, DirectoryFlow)
      }))
  }
  if (ctx.inject) ctx.inject(['slots', 'uiWorkspace', 'remote'], register)
  else register()
}

function DirectoryFlow(props: DirectoryFlowProps): React.ReactElement | null {
  const snapshot = props.useWorkspaces?.(value => value)
  const workspaces = useMemo(() => normalizeWorkspaces(snapshot), [snapshot])
  const [conflicts, setConflicts] = useState<ConflictState>({ labels: [], unknown: false })
  useEffect(() => {
    if (!props.open || !pluginContext) return
    void detectConflicts(pluginContext).then(setConflicts)
  }, [props.open])
  const api = bindServices(pluginContext)
  if (!props.open) return null
  return (
    <NewWorkspaceDialog
      open={props.open}
      busy={props.busy}
      onPicked={props.onPicked}
      onCancel={props.onCancel}
      onError={props.onError}
      listDirectory={api.listDirectory}
      createDirectory={api.createDirectory}
      pickDirectory={api.pickDirectory}
      renameWorkspace={api.renameWorkspace}
      workspaces={workspaces}
      conflictLabels={conflicts.labels}
      conflictUnknown={conflicts.unknown}
    />
  )
}

function bindServices(ctx: ClientContext | null): {
  listDirectory?: (path?: string, signal?: AbortSignal) => Promise<DirectoryListing>
  createDirectory?: (path: string, name: string) => Promise<string>
  pickDirectory?: () => Promise<string | null>
  renameWorkspace?: (workspaceId: string, title: string) => Promise<void>
} {
  const listDirectory = ctx?.uiWorkspace?.listDirectory ?? ctx?.remote?.directoryPicker?.list
  const createDirectory = ctx?.uiWorkspace?.createDirectory ?? ctx?.remote?.directoryPicker?.createDirectory
  const picker = ctx?.uiWorkspace?.pickDirectory ?? ctx?.remote?.directoryPicker?.pick
  const rename = ctx?.remote?.workspace?.rename
  return {
    listDirectory: listDirectory ? (path, signal) => listDirectory.call(ctx?.uiWorkspace ?? ctx?.remote?.directoryPicker, path, signal) : undefined,
    createDirectory: createDirectory ? (path, name) => createDirectory.call(ctx?.uiWorkspace ?? ctx?.remote?.directoryPicker, path, name) : undefined,
    pickDirectory: picker ? () => picker.call(ctx?.uiWorkspace ?? ctx?.remote?.directoryPicker) : undefined,
    renameWorkspace: rename
      ? async (workspaceId, title) => {
        try { await rename({ workspaceId, title }) }
        catch { await rename({ id: workspaceId, title }) }
      }
      : undefined,
  }
}

export async function detectConflicts(ctx: ClientContext): Promise<ConflictState> {
  const labels = new Set<string>()
  let unknown = false
  for (const hole of DIRECTORY_FLOW_HOLES) {
    let entries: readonly SlotEntry[] = []
    try { entries = ctx.slots.entries?.(hole) ?? [] } catch { entries = [] }
    for (const entry of entries) {
      const registrant = entry.registrant ?? entry.options?.id ?? entry.options?.name
      const priority = entry.priority ?? entry.options?.priority ?? 0
      if (isSelf(registrant)) continue
      if (isOfficial(registrant, priority)) continue
      if (registrant) labels.add(String(registrant))
      else unknown = true
    }
  }
  try {
    const listed = await ctx.remote?.pluginInventory?.list?.()
    const items = Array.isArray(listed) ? listed : listed?.entries ?? []
    for (const item of items) {
      const candidates = [item.moduleName, item.name, item.packageName, item.entryId, item.id].filter(Boolean) as string[]
      if (candidates.some(isSelf)) continue
      const hit = candidates.find(value => INCOMPATIBLE_PACKAGES.some(pkg => value.includes(pkg)))
      if (hit) labels.add(hit)
    }
  } catch {
    /* inventory is optional and unverified as a package-name source */
  }
  return { labels: [...labels], unknown: unknown && labels.size === 0 }
}

function isSelf(value: string | undefined): boolean {
  return Boolean(value && (value === PLUGIN_ID || value.includes('dsh-new-workspace')))
}

function isOfficial(value: string | undefined, priority: number): boolean {
  if (!value) return priority === 0
  return /@deepseek-ai\//.test(value) || /directory-picker-(native|browse)/.test(value) || /ui-directory-picker/.test(value)
}
