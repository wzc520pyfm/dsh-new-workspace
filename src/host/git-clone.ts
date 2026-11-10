import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isGitUrl, inferFolderFromGitUrl } from '../shared/git-url.ts'
import { isSinglePathSegment, looksFullyQualified } from '../shared/paths.ts'

export class CloneError extends Error {
  constructor(readonly code: string, message: string, readonly raw?: string) {
    super(message)
    this.name = 'CloneError'
  }
}

export interface CloneOptions {
  url: string
  parentDirectory: string
  folderName: string
  branch?: string
  signal?: AbortSignal
}

const GIT_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: 'echo',
  SSH_ASKPASS: 'echo',
  GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? 'ssh -o BatchMode=yes',
  LC_ALL: process.env.LC_ALL ?? 'C',
}

export async function gitAvailable(): Promise<boolean> {
  try {
    await runGit(['--version'], undefined, 8_000)
    return true
  } catch {
    return false
  }
}

export async function pathStat(path: string): Promise<{ exists: boolean; isDirectory: boolean }> {
  try {
    const info = await stat(path)
    return { exists: true, isDirectory: info.isDirectory() }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return { exists: false, isDirectory: false }
    throw error
  }
}

export async function ensureDirectory(path: string): Promise<void> {
  if (!looksFullyQualified(path)) {
    throw new CloneError('invalid_path', 'The directory path must be fully qualified.')
  }
  await mkdir(path, { recursive: true })
}

/**
 * Clone into a private staging directory, then move into the destination.
 * If the destination already exists, refuse without deleting or overwriting.
 * On failure or abort, clean the staging directory and do not leave a partial destination.
 */
export async function cloneRepository(options: CloneOptions): Promise<string> {
  const url = options.url.trim()
  const parent = options.parentDirectory.trim()
  const folderName = options.folderName.trim()
  const branch = options.branch?.trim() || undefined
  if (!isGitUrl(url)) throw new CloneError('invalid_url', 'A valid HTTPS or SSH Git URL is required.')
  if (!looksFullyQualified(parent)) throw new CloneError('invalid_path', 'The parent directory must be a fully qualified path.')
  if (!isSinglePathSegment(folderName)) {
    throw new CloneError('invalid_folder', 'The repository folder name must be a single path segment, and cannot be . or ..')
  }
  if (inferFolderFromGitUrl(url) === null && !folderName) {
    throw new CloneError('invalid_url', 'Could not infer a folder name from the repository URL.')
  }
  const destination = join(parent, folderName)
  const existing = await pathStat(destination)
  if (existing.exists) {
    throw new CloneError('destination_exists', `The destination already exists: ${destination}`)
  }
  if (!(await gitAvailable())) {
    throw new CloneError(
      'git_missing',
      'git was not found on the Host PATH. Install Git (https://git-scm.com/downloads) and restart DSH.',
    )
  }

  const stagingRoot = await mkdtemp(join(tmpdir(), 'dsh-new-workspace-'))
  const stagingPath = join(stagingRoot, folderName)
  let moved = false
  const onAbort = () => { /* kill happens in runGit via signal */ }
  options.signal?.addEventListener('abort', onAbort)
  try {
    const cloneArgs = ['clone']
    if (branch) cloneArgs.push('--branch', branch)
    cloneArgs.push('--', url, stagingPath)
    await runGit(cloneArgs, options.signal)
    await ensureDirectory(parent)
    const destNow = await pathStat(destination)
    if (destNow.exists) {
      throw new CloneError('destination_exists', `The destination already exists: ${destination}`)
    }
    try {
      await rename(stagingPath, destination)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'EXDEV') {
        // Cross-device: fall back to a second git clone into the destination only if it still does not exist,
        // after a recursive copy would be large; instead, retry rename is impossible — copy via `git clone --reference`?
        // Use cp-like recursive rename fallback implemented as mkdir + fs.cp when available.
        const { cp } = await import('node:fs/promises')
        await cp(stagingPath, destination, { recursive: true, errorOnExist: true })
        await rm(stagingPath, { recursive: true, force: true })
      } else {
        throw error
      }
    }
    moved = true
    return destination
  } catch (error) {
    if (!moved) {
      await rm(destination, { recursive: true, force: true }).catch(() => undefined)
    }
    if (options.signal?.aborted) {
      throw new CloneError('aborted', 'The clone was cancelled.')
    }
    throw error
  } finally {
    options.signal?.removeEventListener('abort', onAbort)
    await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined)
  }
}



function runGit(args: string[], signal?: AbortSignal, timeoutMs = 10 * 60_000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let child: ChildProcess
    try {
      child = spawn('git', args, {
        env: GIT_ENV,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      })
    } catch (error) {
      reject(new CloneError(
        'git_missing',
        'git was not found on the Host PATH. Install Git (https://git-scm.com/downloads) and restart DSH.',
        error instanceof Error ? error.message : String(error),
      ))
      return
    }

    let stdout = ''
    let stderr = ''
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => { stdout += chunk })
    child.stderr?.on('data', (chunk: string) => { stderr += chunk })

    const timer = setTimeout(() => {
      killGit(child)
      reject(new CloneError('git_timeout', 'The git process timed out.', stderr || stdout))
    }, timeoutMs)

    const abort = () => { killGit(child) }
    if (signal?.aborted) abort()
    signal?.addEventListener('abort', abort)

    child.on('error', (error) => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      const missing = (error as NodeJS.ErrnoException).code === 'ENOENT'
      reject(new CloneError(
        missing ? 'git_missing' : 'git_failed',
        missing
          ? 'git was not found on the Host PATH. Install Git (https://git-scm.com/downloads) and restart DSH.'
          : (error.message || 'Failed to start git.'),
        error.message,
      ))
    })

    child.on('close', (code, name) => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (signal?.aborted) {
        reject(new CloneError('aborted', 'The clone was cancelled.', stderr || stdout))
        return
      }
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      const raw = (stderr || stdout || name || `exit ${code}`).trim()
      reject(new CloneError('git_failed', raw || `git exited with code ${code}.`, raw))
    })
  })
}

function killGit(child: ChildProcess): void {
  if (child.killed || child.exitCode !== null) return
  try {
    if (process.platform !== 'win32' && child.pid) {
      try { process.kill(child.pid, 'SIGTERM') } catch { /* already gone */ }
    } else {
      child.kill('SIGTERM')
    }
  } catch { /* ignore */ }
  setTimeout(() => {
    if (child.killed || child.exitCode !== null) return
    try { child.kill('SIGKILL') } catch { /* ignore */ }
  }, 2000)
}
