/** Host path helpers that work in both Node and the browser. Do not assume process.platform. */

export function hostSep(samplePath: string): '/' | '\\' {
  if (/^[A-Za-z]:[\\/]/.test(samplePath) || (samplePath.includes('\\') && !samplePath.includes('/'))) return '\\'
  if (samplePath.includes('\\') && /^[A-Za-z]:/.test(samplePath)) return '\\'
  return '/'
}

export function trimTrailingSeps(value: string): string {
  return value.replace(/[\\/]+$/, '')
}

export function joinHostPath(parent: string, name: string): string {
  const trimmed = trimTrailingSeps(parent)
  if (!trimmed) return name
  return `${trimmed}${hostSep(parent)}${name}`
}

export function baseName(path: string): string {
  const trimmed = trimTrailingSeps(path)
  const parts = trimmed.split(/[\\/]/)
  return parts[parts.length - 1] ?? trimmed
}

export function parentOf(path: string): string | null {
  const trimmed = trimTrailingSeps(path)
  const sep = hostSep(path)
  if (/^[A-Za-z]:$/.test(trimmed)) return null
  if (trimmed === '/' || trimmed === '') return null
  const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  if (idx < 0) return null
  if (idx === 0) return '/'
  const parent = trimmed.slice(0, idx)
  if (/^[A-Za-z]:$/.test(parent)) return parent + sep
  return parent || null
}

export function isSinglePathSegment(name: string): boolean {
  const value = name.trim()
  if (!value) return false
  if (value === '.' || value === '..') return false
  if (/[/\\]/.test(value) || value.includes('\0')) return false
  return true
}

export type NameValidation =
  | { ok: true; name: string }
  | { ok: false; reason: 'empty' | 'dot' | 'separator' }

export function validateWorkspaceName(raw: string): NameValidation {
  const name = raw.trim()
  if (!name) return { ok: false, reason: 'empty' }
  if (name === '.' || name === '..') return { ok: false, reason: 'dot' }
  if (/[/\\]/.test(name) || name.includes('\0')) return { ok: false, reason: 'separator' }
  return { ok: true, name }
}

export function pathsRoughlyEqual(left: string, right: string): boolean {
  const norm = (value: string) => {
    const trimmed = trimTrailingSeps(value.replace(/\\/g, '/'))
    if (/^[A-Za-z]:/.test(trimmed)) return trimmed.toLowerCase()
    return trimmed
  }
  return norm(left) === norm(right)
}

export function isDefaultWorkspacePath(path: string): boolean {
  return baseName(path) === 'default-workspace'
}

export function looksFullyQualified(path: string): boolean {
  const value = path.trim()
  if (!value) return false
  if (value.startsWith('/')) return true
  if (/^[A-Za-z]:[\\/]/.test(value)) return true
  if (value.startsWith('\\\\')) return true
  return false
}
