export const PLUGIN_ID = 'dsh-new-workspace'
export const API_PREFIX = '/api/dsh-new-workspace'
export const DEFAULT_WORKSPACE_DIRECTORY = 'default-workspace'
export const HARNESS_FOLDER = 'deepseek-harness'
/** Storage key persisted in `$DSH_HOME/dsh-new-workspace/settings.json`. */
export const SETTINGS_LOCATION_KEY = 'newWorkspaceLocation'
export const SETTINGS_LOCALE_KEY = 'locale'
/** Lower than official omitted/default priority 0, and than typical community -10/-100. */
export const DIRECTORY_FLOW_PRIORITY = -110
export const DIRECTORY_FLOW_HOLES = [
  'conversation.hero.workspace.directoryFlow',
  'sidebar.workspaces.directoryFlow',
] as const
export type DirectoryFlowHole = (typeof DIRECTORY_FLOW_HOLES)[number]

export type SourceMode = 'local' | 'clone'
export type UiLocale = 'en' | 'zh'

export interface PluginSettings {
  newWorkspaceLocation?: string
  locale?: UiLocale
}

export interface DefaultsResponse {
  location: string | null
  locationSource: 'saved' | 'default-workspace-parent' | 'documents-harness' | 'unset'
  documentsPath: string | null
  documentsAvailable: boolean
  defaultWorkspacePath: string | null
  homePath: string | null
  nativePickAvailable: boolean
  gitAvailable: boolean
  locale?: UiLocale
}

export interface PathStat {
  exists: boolean
  isDirectory: boolean
}

export interface CloneRequest {
  url: string
  parentDirectory: string
  folderName: string
  branch?: string
}

export interface CloneResult {
  path: string
}

export const INCOMPATIBLE_PACKAGES = [
  'dsh-workspace-create-dialog',
  'dsh-workspace-git',
  'dsh-quick-workspace',
  'dsh-plugin-workspace-multi',
  'dsh-wsl-workspace-picker',
  'dsh-workspace-quick-create',
] as const

export const INCOMPATIBLE_REPOS = [
  'lanfeng97/dsh-workspace-create-dialog',
  'leonardoxr/dsh-workspace-git',
  'wilsonchengassistant/dsh-quick-workspace',
  'skylarking/dsh-plugin-workspace-multi',
  'WilliamShi666/dsh-wsl-workspace-picker',
] as const

export const COEXIST_OK_PACKAGES = ['dsh-tool-github'] as const

export interface ApiEnvelope<T> { ok: true; data: T }
export interface ApiErrorEnvelope { ok: false; error: { code: string; message: string } }
