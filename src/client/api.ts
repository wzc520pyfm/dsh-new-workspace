import { API_PREFIX } from '../shared/types.ts'
import type {
  ApiEnvelope, ApiErrorEnvelope, CloneRequest, DefaultsResponse, PathStat, PluginSettings,
} from '../shared/types.ts'

export class HostApiError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
    this.name = 'HostApiError'
  }
}

async function post<T>(path: string, payload: object = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_PREFIX}/${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  let value: ApiEnvelope<T> | ApiErrorEnvelope
  try { value = await response.json() as ApiEnvelope<T> | ApiErrorEnvelope }
  catch { throw new HostApiError('invalid_response', `Request failed (${response.status})`) }
  if (!response.ok || !value.ok) {
    const error = value.ok ? undefined : value.error
    throw new HostApiError(error?.code ?? 'request_failed', error?.message ?? `Request failed (${response.status})`)
  }
  return value.data
}

export const fetchDefaults = (signal?: AbortSignal) => post<DefaultsResponse>('defaults', {}, signal)
export const fetchStat = (path: string, signal?: AbortSignal) => post<PathStat>('stat', { path }, signal)
export const createHostDirectory = (path: string, signal?: AbortSignal) => post<{ path: string }>('mkdir', { path }, signal)
export const saveSettings = (patch: PluginSettings, signal?: AbortSignal) => post<PluginSettings>('settings', patch, signal)
export const cloneRepository = (request: CloneRequest, signal?: AbortSignal) => post<{ path: string; jobId?: string }>('clone', request, signal)
