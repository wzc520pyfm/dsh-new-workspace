import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Resolve the account Documents directory using the policy documented by the
 * official workspace controller: system Documents, not the home directory root.
 * Returns undefined when Documents cannot be resolved or does not exist.
 */
export async function resolveDocumentsPath(): Promise<string | undefined> {
  const platform = process.platform
  if (platform === 'darwin') {
    return existingDir(join(homedir(), 'Documents'))
  }
  if (platform === 'win32') {
    const userProfile = process.env.USERPROFILE || homedir()
    const candidates = [
      process.env.USERPROFILE ? join(process.env.USERPROFILE, 'Documents') : undefined,
      join(userProfile, 'Documents'),
      process.env.PUBLIC ? join(process.env.PUBLIC, 'Documents') : undefined,
    ]
    for (const candidate of candidates) {
      const found = existingDir(candidate)
      if (found) return found
    }
    return undefined
  }
  const xdg = process.env.XDG_DOCUMENTS_DIR?.trim()
  if (xdg) return existingDir(xdg)
  try {
    const { stdout } = await execFileAsync('xdg-user-dir', ['DOCUMENTS'], { timeout: 3000, windowsHide: true })
    const path = stdout.trim()
    if (path && path !== homedir()) return existingDir(path)
  } catch {
    /* xdg-user-dir is optional */
  }
  return existingDir(join(homedir(), 'Documents'))
}

function existingDir(path: string | undefined): string | undefined {
  if (!path) return undefined
  try {
    if (existsSync(path)) return path
  } catch {
    return undefined
  }
  return undefined
}

export function defaultHarnessParent(documentsPath: string): string {
  return join(documentsPath, 'deepseek-harness')
}
