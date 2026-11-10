import { isSinglePathSegment } from './paths.ts'

const HTTPS = /^(https?|git|ssh):\/\//i
const SCP = /^(?:git@|[^@\s]+@)[^:\s]+:\S+$/

export function isGitUrl(raw: string): boolean {
  const value = raw.trim()
  if (!value) return false
  if (HTTPS.test(value)) return true
  if (SCP.test(value)) return true
  return false
}

/**
 * Infer a folder name from a Git URL, stripping a trailing `.git`.
 * Returns null when the URL has no usable single-segment name.
 */
export function inferFolderFromGitUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  let rest = value.replace(/\/+$/, '')
  if (SCP.test(rest) && !HTTPS.test(rest)) {
    const colon = rest.indexOf(':')
    rest = colon >= 0 ? rest.slice(colon + 1) : rest
  } else {
    try {
      const parsed = new URL(rest)
      rest = parsed.pathname
    } catch {
      const cut = rest.replace(/^[a-z]+:\/\//i, '')
      const slash = cut.indexOf('/')
      rest = slash >= 0 ? cut.slice(slash + 1) : cut
    }
  }
  rest = rest.replace(/\/+$/, '')
  if (rest.endsWith('.git')) rest = rest.slice(0, -4)
  rest = rest.replace(/\/+$/, '')
  const segments = rest.split(/[\\/]/).filter(Boolean)
  const last = segments[segments.length - 1]
  if (!last) return null
  let name = last
  try { name = decodeURIComponent(last) } catch { /* keep raw */ }
  if (!isSinglePathSegment(name)) return null
  return name
}
