import { randomUUID } from 'node:crypto'
import { API_PREFIX, PLUGIN_ID } from '../shared/types.ts'
import type { CloneRequest, DefaultsResponse, PluginSettings } from '../shared/types.ts'
import { DEFAULT_WORKSPACE_DIRECTORY } from '../shared/types.ts'
import { looksFullyQualified } from '../shared/paths.ts'
import { defaultHarnessParent, resolveDocumentsPath } from './documents.ts'
import { cloneRepository, CloneError, gitAvailable, pathStat, ensureDirectory } from './git-clone.ts'
import { header, HttpError, isSameOrigin, readJsonBody, sendError, sendJson, type RequestLike, type ResponseLike } from './http.ts'
import { readSettings, writeSettings } from './settings.ts'

export const name = PLUGIN_ID
export const inject = ['webServer']

interface WorkspaceLike { readonly path?: string; readonly id?: string; readonly title?: string }
interface HostContext {
  effect?(callback: () => void | (() => void), label?: string): void
  webServer?: { register(route: { kind: string; path: string; handler: (req: RequestLike, res: ResponseLike) => Promise<void> | void }): () => void }
  workspaceRegistry?: { list(): WorkspaceLike[] }
  directoryPicker?: { capability(): { kind?: string } }
}

const jobs = new Map<string, AbortController>()

export function apply(ctx: HostContext): void {
  const register = () => {
    if (!ctx.webServer?.register) return () => undefined
    return ctx.webServer.register({
      kind: 'prefix',
      path: API_PREFIX,
      handler: (req, res) => route(ctx, req, res),
    })
  }
  if (ctx.effect) ctx.effect(register, 'dsh-new-workspace: routes')
  else register()
}

async function route(ctx: HostContext, req: RequestLike, res: ResponseLike): Promise<void> {
  if (!isSameOrigin(req.headers)) { sendError(res, 403, 'cross_origin', 'Cross-origin requests are refused'); return }
  if (String(req.method ?? '').toUpperCase() !== 'POST') { sendError(res, 405, 'method_not_allowed', 'Only POST is supported'); return }
  if (!/^application\/json(?:\s*;|$)/i.test(header(req.headers, 'content-type'))) {
    sendError(res, 415, 'json_required', 'Content-Type must be application/json'); return
  }
  try {
    const url = new URL(req.url ?? '/', 'http://dsh.local')
    const body = await readJsonBody(req as unknown as NodeJS.ReadableStream)
    const signal = abortOnClose(req)

    if (url.pathname === `${API_PREFIX}/defaults`) {
      sendJson(res, 200, { ok: true, data: await defaults(ctx) }); return
    }
    if (url.pathname === `${API_PREFIX}/settings`) {
      sendJson(res, 200, { ok: true, data: await updateSettings(body) }); return
    }
    if (url.pathname === `${API_PREFIX}/stat`) {
      const path = stringField(body, 'path')
      if (!path || !looksFullyQualified(path)) throw new HttpError(400, 'invalid_path', 'A fully qualified path is required')
      sendJson(res, 200, { ok: true, data: await pathStat(path) }); return
    }
    if (url.pathname === `${API_PREFIX}/mkdir`) {
      const path = stringField(body, 'path')
      if (!path || !looksFullyQualified(path)) throw new HttpError(400, 'invalid_path', 'A fully qualified path is required')
      await ensureDirectory(path)
      sendJson(res, 200, { ok: true, data: { path } }); return
    }
    if (url.pathname === `${API_PREFIX}/clone`) {
      const request = parseClone(body)
      const controller = new AbortController()
      const jobId = randomUUID()
      jobs.set(jobId, controller)
      const combined = anySignal(controller.signal, signal)
      try {
        const path = await cloneRepository({ ...request, signal: combined })
        sendJson(res, 200, { ok: true, data: { path, jobId } })
      } finally {
        jobs.delete(jobId)
      }
      return
    }
    if (url.pathname === `${API_PREFIX}/abort`) {
      const jobId = stringField(body, 'jobId')
      if (jobId) jobs.get(jobId)?.abort()
      sendJson(res, 200, { ok: true, data: { aborted: true } }); return
    }
    sendError(res, 404, 'route_not_found', 'Route was not found')
  } catch (error) {
    if (error instanceof HttpError) { sendError(res, error.status, error.code, error.message); return }
    if (error instanceof CloneError) {
      const status = error.code === 'aborted' ? 499 : error.code === 'destination_exists' || error.code === 'invalid_url' || error.code === 'invalid_path' || error.code === 'invalid_folder' ? 409 : 500
      sendError(res, status === 499 ? 409 : status, error.code, error.raw ? `${error.message}` : error.message)
      return
    }
    sendError(res, 500, 'host_failed', error instanceof Error ? error.message : 'The host request failed')
  }
}

async function defaults(ctx: HostContext): Promise<DefaultsResponse> {
  const settings = await readSettings()
  const documentsPath = await resolveDocumentsPath() ?? null
  const workspaces = safeList(ctx)
  const defaultWorkspace = workspaces.find(item => typeof item.path === 'string' && item.path.split(/[\\/]/).pop() === DEFAULT_WORKSPACE_DIRECTORY)
  const defaultWorkspacePath = defaultWorkspace?.path ?? null
  let location: string | null = null
  let locationSource: DefaultsResponse['locationSource'] = 'unset'
  if (settings.newWorkspaceLocation?.trim()) {
    location = settings.newWorkspaceLocation.trim()
    locationSource = 'saved'
  } else if (defaultWorkspacePath) {
    const parent = defaultWorkspacePath.replace(/[\\/]+$/, '').replace(/[\\/]default-workspace$/i, '')
    if (parent && parent !== defaultWorkspacePath) {
      location = parent
      locationSource = 'default-workspace-parent'
    }
  }
  if (!location && documentsPath) {
    location = defaultHarnessParent(documentsPath)
    locationSource = 'documents-harness'
  }
  let nativePickAvailable = false
  try {
    nativePickAvailable = ctx.directoryPicker?.capability()?.kind === 'native'
  } catch {
    nativePickAvailable = false
  }
  return {
    location,
    locationSource,
    documentsPath,
    documentsAvailable: Boolean(documentsPath),
    defaultWorkspacePath,
    homePath: null,
    nativePickAvailable,
    gitAvailable: await gitAvailable(),
    locale: settings.locale,
  }
}

async function updateSettings(body: Record<string, unknown>): Promise<PluginSettings> {
  const patch: PluginSettings = {}
  if ('newWorkspaceLocation' in body) {
    const value = body.newWorkspaceLocation
    if (value === null || value === '') patch.newWorkspaceLocation = undefined
    else if (typeof value === 'string' && looksFullyQualified(value.trim())) patch.newWorkspaceLocation = value.trim()
    else throw new HttpError(400, 'invalid_path', 'newWorkspaceLocation must be a fully qualified path or empty')
  }
  if ('locale' in body) {
    const value = body.locale
    if (value === 'en' || value === 'zh' || value === null || value === '') {
      patch.locale = value === 'en' || value === 'zh' ? value : undefined
    } else {
      throw new HttpError(400, 'invalid_locale', 'locale must be en or zh')
    }
  }
  return writeSettings(patch)
}

function parseClone(body: Record<string, unknown>): CloneRequest {
  const url = stringField(body, 'url')
  const parentDirectory = stringField(body, 'parentDirectory')
  const folderName = stringField(body, 'folderName')
  const branch = stringField(body, 'branch')
  if (!url || !parentDirectory || !folderName) {
    throw new HttpError(400, 'invalid_clone', 'url, parentDirectory, and folderName are required')
  }
  return { url, parentDirectory, folderName, ...branch ? { branch } : {} }
}

function stringField(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function safeList(ctx: HostContext): WorkspaceLike[] {
  try {
    const list = ctx.workspaceRegistry?.list?.()
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function abortOnClose(req: RequestLike): AbortSignal {
  const controller = new AbortController()
  req.on?.('close', () => controller.abort())
  req.on?.('aborted', () => controller.abort())
  return controller.signal
}

function anySignal(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  const abort = () => controller.abort()
  for (const signal of signals) {
    if (signal.aborted) { controller.abort(); break }
    signal.addEventListener('abort', abort)
  }
  return controller.signal
}
