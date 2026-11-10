import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { PluginSettings, UiLocale } from '../shared/types.ts'
import { SETTINGS_LOCATION_KEY, SETTINGS_LOCALE_KEY } from '../shared/types.ts'

export function dshHome(): string {
  return process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
}

export function settingsPath(): string {
  return join(dshHome(), 'dsh-new-workspace', 'settings.json')
}

export async function readSettings(): Promise<PluginSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const record = parsed as Record<string, unknown>
    const location = record[SETTINGS_LOCATION_KEY]
    const locale = record[SETTINGS_LOCALE_KEY]
    return {
      ...typeof location === 'string' && location.trim() ? { newWorkspaceLocation: location.trim() } : {},
      ...locale === 'en' || locale === 'zh' ? { locale: locale as UiLocale } : {},
    }
  } catch {
    return {}
  }
}

export async function writeSettings(patch: PluginSettings): Promise<PluginSettings> {
  const current = await readSettings()
  const next: PluginSettings = { ...current }
  if ('newWorkspaceLocation' in patch) {
    const value = patch.newWorkspaceLocation?.trim()
    if (value) next.newWorkspaceLocation = value
    else delete next.newWorkspaceLocation
  }
  if ('locale' in patch) {
    if (patch.locale === 'en' || patch.locale === 'zh') next.locale = patch.locale
    else delete next.locale
  }
  const dir = join(dshHome(), 'dsh-new-workspace')
  await mkdir(dir, { recursive: true })
  await writeFile(settingsPath(), `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  return next
}
