import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { DefaultsResponse, SourceMode, UiLocale } from '../shared/types.ts'
import { inferFolderFromGitUrl, isGitUrl } from '../shared/git-url.ts'
import { baseName, isSinglePathSegment, joinHostPath, looksFullyQualified, validateWorkspaceName } from '../shared/paths.ts'
import { cloneRepository, createHostDirectory, fetchDefaults, fetchStat, HostApiError, saveSettings } from './api.ts'
import { DirectoryBrowser } from './browse.tsx'
import type { DirectoryListing } from './browse.tsx'
import { translate, type MessageKey } from './i18n.ts'
import { findWorkspace, normalizeWorkspaces, type WorkspaceRow } from './workspaces.ts'

export interface DialogInjected {
  listDirectory?: (path?: string, signal?: AbortSignal) => Promise<DirectoryListing>
  createDirectory?: (path: string, name: string) => Promise<string>
  pickDirectory?: () => Promise<string | null>
  renameWorkspace?: (workspaceId: string, title: string) => Promise<void>
  workspaces: WorkspaceRow[]
  conflictLabels: string[]
  conflictUnknown: boolean
}

export interface DialogProps extends DialogInjected {
  open: boolean
  busy: boolean
  onPicked: (path: string) => void
  onCancel: () => void
  onError: (message: string) => void
}

type BrowseTarget = 'location' | 'existing' | 'parent' | null

export function NewWorkspaceDialog(props: DialogProps): React.ReactElement | null {
  const [locale, setLocale] = useState<UiLocale>('en')
  const [source, setSource] = useState<SourceMode>('local')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [existingFolder, setExistingFolder] = useState<string | null>(null)
  const [repoUrl, setRepoUrl] = useState('')
  const [parentDirectory, setParentDirectory] = useState('')
  const [folderName, setFolderName] = useState('')
  const [folderTouched, setFolderTouched] = useState(false)
  const [branch, setBranch] = useState('')
  const [defaults, setDefaults] = useState<DefaultsResponse | null>(null)
  const [status, setStatus] = useState<'idle' | 'working'>('idle')
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [browse, setBrowse] = useState<BrowseTarget>(null)
  const [locationExists, setLocationExists] = useState<boolean | null>(null)
  const [existingExists, setExistingExists] = useState<boolean | null>(null)
  const [parentExists, setParentExists] = useState<boolean | null>(null)
  const [destExists, setDestExists] = useState(false)
  const [nativeHint, setNativeHint] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const opened = useRef(false)
  const t = (key: MessageKey) => translate(locale, key)

  useEffect(() => {
    if (!props.open) {
      abortRef.current?.abort()
      abortRef.current = null
      setStatus('idle')
      setBrowse(null)
      opened.current = false
      return
    }
    if (opened.current) return
    opened.current = true
    setSource('local')
    setName('')
    setExistingFolder(null)
    setRepoUrl('')
    setFolderName('')
    setFolderTouched(false)
    setBranch('')
    setMessage(null)
    setSavedNote(null)
    setStatus('idle')
    const controller = new AbortController()
    void fetchDefaults(controller.signal).then((value) => {
      setDefaults(value)
      if (value.locale === 'en' || value.locale === 'zh') setLocale(value.locale)
      setLocation(value.location ?? '')
      setParentDirectory(value.location ?? '')
    }).catch((error: unknown) => {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : t('genericError') })
    })
    const timer = window.setTimeout(() => nameRef.current?.focus(), 0)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [props.open])

  useEffect(() => {
    if (!props.open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && status === 'idle') {
        event.preventDefault()
        cancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.open, status])

  useEffect(() => {
    const inferred = inferFolderFromGitUrl(repoUrl)
    if (!folderTouched) setFolderName(inferred ?? '')
  }, [repoUrl, folderTouched])

  useEffect(() => { void statPath(location, setLocationExists) }, [location])
  useEffect(() => { void statPath(existingFolder, setExistingExists) }, [existingFolder])
  useEffect(() => { void statPath(parentDirectory, setParentExists) }, [parentDirectory])
  useEffect(() => {
    const dest = source === 'clone' && parentDirectory && folderName ? joinHostPath(parentDirectory, folderName) : ''
    void statPath(dest || null, (exists) => setDestExists(Boolean(exists)))
  }, [source, parentDirectory, folderName])

  const workspaces = props.workspaces
  const localTarget = existingFolder || (name.trim() && location ? joinHostPath(location, name.trim()) : '')
  const registered = localTarget ? findWorkspace(workspaces, localTarget) : undefined
  const cloneDest = source === 'clone' && parentDirectory && folderName ? joinHostPath(parentDirectory, folderName) : ''

  const nameError = useMemo(() => {
    if (!name.trim()) return existingFolder ? null : (source === 'local' ? 'nameRequired' : null)
    const result = validateWorkspaceName(name)
    if (result.ok) return null
    return result.reason === 'dot' ? 'nameInvalidDot' : result.reason === 'separator' ? 'nameInvalidSeparator' : 'nameRequired'
  }, [name, existingFolder, source])

  if (!props.open) return null

  function cancel(): void {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
    props.onCancel()
  }

  async function persistLocation(path: string): Promise<void> {
    if (!looksFullyQualified(path)) return
    try { await saveSettings({ newWorkspaceLocation: path }) } catch { /* non-fatal */ }
  }

  async function onPrimary(): Promise<void> {
    setMessage(null)
    setSavedNote(null)
    if (source === 'clone') {
      await runClone()
      return
    }
    await runLocal()
  }

  async function runLocal(): Promise<void> {
    if (existingFolder) {
      if (!looksFullyQualified(existingFolder)) {
        setMessage({ kind: 'error', text: t('nameRequired') }); return
      }
      if (name.trim()) {
        const result = validateWorkspaceName(name)
        if (!result.ok) { setMessage({ kind: 'error', text: t(nameError ?? 'nameInvalidSeparator') }); return }
      }
      finish(existingFolder, name.trim() || baseName(existingFolder))
      return
    }
    const result = validateWorkspaceName(name)
    if (!result.ok) { setMessage({ kind: 'error', text: t(nameError ?? 'nameRequired') }); return }
    if (!looksFullyQualified(location)) {
      setMessage({ kind: 'error', text: t('documentsMissing') }); return
    }
    setStatus('working')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const dest = joinHostPath(location, result.name)
      const already = await fetchStat(dest, controller.signal)
      if (already.exists && !already.isDirectory) {
        throw new Error(`The path exists and is not a directory: ${dest}`)
      }
      if (!already.exists) {
        if (locationExists === false) await createHostDirectory(location, controller.signal)
        if (props.createDirectory && locationExists !== false) {
          try { await props.createDirectory(location, result.name) }
          catch { await createHostDirectory(dest, controller.signal) }
        } else {
          await createHostDirectory(dest, controller.signal)
        }
      }
      await persistLocation(location)
      finish(dest, result.name)
    } catch (error) {
      if (controller.signal.aborted) return
      setStatus('idle')
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : t('genericError') })
    }
  }

  async function runClone(): Promise<void> {
    if (!repoUrl.trim()) { setMessage({ kind: 'error', text: t('urlRequired') }); return }
    if (!isGitUrl(repoUrl)) { setMessage({ kind: 'error', text: t('urlInvalid') }); return }
    if (!looksFullyQualified(parentDirectory)) { setMessage({ kind: 'error', text: t('parentRequired') }); return }
    if (!isSinglePathSegment(folderName)) { setMessage({ kind: 'error', text: t('folderRequired') }); return }
    if (destExists) { setMessage({ kind: 'error', text: t('destExists') }); return }
    if (name.trim()) {
      const result = validateWorkspaceName(name)
      if (!result.ok) { setMessage({ kind: 'error', text: t(nameError ?? 'nameInvalidSeparator') }); return }
    }
    if (defaults && defaults.gitAvailable === false) { setMessage({ kind: 'error', text: t('gitMissing') }); return }
    setStatus('working')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const cloned = await cloneRepository({
        url: repoUrl.trim(),
        parentDirectory: parentDirectory.trim(),
        folderName: folderName.trim(),
        ...branch.trim() ? { branch: branch.trim() } : {},
      }, controller.signal)
      await persistLocation(parentDirectory.trim())
      finish(cloned.path, name.trim() || folderName.trim())
    } catch (error) {
      if (controller.signal.aborted) return
      setStatus('idle')
      const text = error instanceof HostApiError && error.code === 'git_missing'
        ? t('gitMissing')
        : error instanceof HostApiError && error.code === 'destination_exists'
          ? t('destExists')
          : error instanceof Error ? error.message : t('genericError')
      setMessage({ kind: 'error', text })
    }
  }

  function finish(path: string, displayName: string): void {
    const registeredNow = findWorkspace(workspaces, path)
    props.onPicked(path)
    if (displayName && displayName !== baseName(path)) {
      void renameAfter(path, displayName, registeredNow)
    }
    setStatus('idle')
  }

  async function renameAfter(path: string, title: string, known?: WorkspaceRow): Promise<void> {
    if (!props.renameWorkspace) return
    const started = Date.now()
    let row = known ?? findWorkspace(props.workspaces, path)
    while (!row && Date.now() - started < 8000) {
      await new Promise(resolve => window.setTimeout(resolve, 250))
      row = findWorkspace(normalizeWorkspaces(props.workspaces), path) ?? findWorkspace(props.workspaces, path)
    }
    if (!row?.id) return
    try { await props.renameWorkspace(row.id, title) } catch { /* title falls back to folder name */ }
  }

  async function pickNative(target: BrowseTarget): Promise<void> {
    if (!props.pickDirectory) { setNativeHint(true); return }
    try {
      const path = await props.pickDirectory()
      if (!path) return
      applyBrowse(target ?? 'location', path)
    } catch {
      setNativeHint(true)
    }
  }

  function applyBrowse(target: BrowseTarget, path: string): void {
    setBrowse(null)
    if (target === 'existing') setExistingFolder(path)
    else if (target === 'parent') setParentDirectory(path)
    else {
      setLocation(path)
      setParentDirectory(prev => prev || path)
      setExistingFolder(null)
    }
  }

  async function saveDefault(): Promise<void> {
    const path = source === 'clone' ? parentDirectory : location
    if (!looksFullyQualified(path)) return
    try {
      await saveSettings({ newWorkspaceLocation: path, locale })
      setSavedNote(t('locationSaved'))
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : t('genericError') })
    }
  }

  const working = status === 'working' || props.busy
  const primaryLabel = source === 'clone'
    ? t('cloneAndAdd')
    : registered
      ? t('openExisting')
      : t('create')
  const previewPath = source === 'clone' ? cloneDest : localTarget
  const previewKind = registered ? 'previewOpen' : existingFolder && existingExists ? 'previewUseFolder' : 'preview'

  return (
    <div className="dnw-root" role="presentation">
      <div className="dnw-backdrop" onClick={() => { if (!working) cancel() }} />
      <div className="dnw-dialog" role="dialog" aria-modal="true" aria-labelledby="dnw-title" onClick={event => event.stopPropagation()}>
        <div className="dnw-header">
          <h2 className="dnw-title" id="dnw-title">{t('title')}</h2>
          <div className="dnw-header-actions">
            <div className="dnw-lang" role="group" aria-label={t('language')}>
              <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>{t('english')}</button>
              <button type="button" aria-pressed={locale === 'zh'} onClick={() => setLocale('zh')}>{t('chinese')}</button>
            </div>
            <button type="button" className="dnw-icon-btn" onClick={() => { if (!working) cancel() }} aria-label={t('close')}>×</button>
          </div>
        </div>

        {(props.conflictLabels.length > 0 || props.conflictUnknown) ? (
          <div className="dnw-alert" role="status">
            <strong>{t('conflictTitle')}</strong>
            {props.conflictLabels.length > 0
              ? `${t('conflictBody')} ${props.conflictLabels.join(', ')}`
              : t('conflictUnknown')}
          </div>
        ) : null}

        <label className="dnw-field">
          <span className="dnw-label">{t('workspaceName')}</span>
          <input ref={nameRef} className="dnw-input" value={name} onChange={event => setName(event.target.value)} placeholder={t('workspaceNamePlaceholder')} disabled={working} autoFocus />
        </label>

        {browse ? (
          <DirectoryBrowser
            locale={locale}
            listDirectory={props.listDirectory}
            createDirectory={props.createDirectory}
            mkdir={async (path, signal) => { await createHostDirectory(path, signal) }}
            initialPath={browse === 'parent' ? parentDirectory : browse === 'existing' ? existingFolder : location}
            onSelect={path => applyBrowse(browse, path)}
            onCancel={() => setBrowse(null)}
          />
        ) : (
          <>
            <div className="dnw-field">
              <span className="dnw-label">{t('source')}</span>
              <div className="dnw-seg" role="group">
                <button type="button" aria-pressed={source === 'local'} disabled={working} onClick={() => setSource('local')}>{t('sourceLocal')}</button>
                <button type="button" aria-pressed={source === 'clone'} disabled={working} onClick={() => setSource('clone')}>{t('sourceClone')}</button>
              </div>
            </div>

            <div className="dnw-source">
              {source === 'local' ? (
                <>
                  {existingFolder ? (
                    <label className="dnw-field">
                      <span className="dnw-label">{t('useFolder')}</span>
                      <div className="dnw-row">
                        <input className="dnw-input" value={existingFolder} onChange={event => setExistingFolder(event.target.value)} spellCheck={false} disabled={working} />
                        <button type="button" className="dnw-btn" disabled={working} onClick={() => setExistingFolder(null)}>{t('cancel')}</button>
                      </div>
                    </label>
                  ) : (
                    <label className="dnw-field">
                      <span className="dnw-label">{t('location')}</span>
                      <div className="dnw-row">
                        <input className="dnw-input" value={location} onChange={event => setLocation(event.target.value)} placeholder={t('typePathPlaceholder')} spellCheck={false} disabled={working} />
                        <button type="button" className="dnw-btn" disabled={working} onClick={() => setBrowse('location')}>{t('chooseLocation')}</button>
                        <button type="button" className="dnw-btn" disabled={working} onClick={() => void pickNative('location')}>{t('pickNative')}</button>
                      </div>
                      <span className="dnw-help">{t('locationHelp')}</span>
                    </label>
                  )}
                  <div className="dnw-row">
                    <button type="button" className="dnw-btn" disabled={working} onClick={() => setBrowse('existing')}>{t('useFolder')}</button>
                    <button type="button" className="dnw-btn" disabled={working || !looksFullyQualified(location)} onClick={() => void saveDefault()}>{t('saveLocation')}</button>
                  </div>
                  {!existingFolder && location && locationExists === false ? <div className="dnw-hint">{t('locationMissing')}</div> : null}
                  {!location && defaults && !defaults.documentsAvailable ? <div className="dnw-alert">{t('documentsMissing')}</div> : null}
                </>
              ) : (
                <>
                  <label className="dnw-field">
                    <span className="dnw-label">{t('repoUrl')}</span>
                    <input className="dnw-input" value={repoUrl} onChange={event => setRepoUrl(event.target.value)} placeholder={t('repoUrlPlaceholder')} spellCheck={false} disabled={working} />
                  </label>
                  <label className="dnw-field">
                    <span className="dnw-label">{t('parentDirectory')}</span>
                    <div className="dnw-row">
                      <input className="dnw-input" value={parentDirectory} onChange={event => setParentDirectory(event.target.value)} placeholder={t('typePathPlaceholder')} spellCheck={false} disabled={working} />
                      <button type="button" className="dnw-btn" disabled={working} onClick={() => setBrowse('parent')}>{t('chooseLocation')}</button>
                      <button type="button" className="dnw-btn" disabled={working} onClick={() => void pickNative('parent')}>{t('pickNative')}</button>
                    </div>
                  </label>
                  <label className="dnw-field">
                    <span className="dnw-label">{t('folderName')}</span>
                    <input className="dnw-input" value={folderName} onChange={event => { setFolderTouched(true); setFolderName(event.target.value) }} disabled={working} />
                  </label>
                  <label className="dnw-field">
                    <span className="dnw-label">{t('branch')}</span>
                    <input className="dnw-input" value={branch} onChange={event => setBranch(event.target.value)} placeholder={t('branchPlaceholder')} spellCheck={false} disabled={working} />
                  </label>
                  {parentDirectory && parentExists === false ? <div className="dnw-hint">{t('locationMissing')}</div> : null}
                  {destExists ? <div className="dnw-alert dnw-alert-error">{t('destExists')}</div> : null}
                  {defaults && defaults.gitAvailable === false ? <div className="dnw-alert dnw-alert-error">{t('gitMissing')}</div> : null}
                </>
              )}
              {nativeHint ? <div className="dnw-hint">{t('nativeUnavailable')}</div> : null}
              {previewPath ? (
                <div className="dnw-preview">{t(previewKind)}: <code>{previewPath}</code></div>
              ) : null}
              {savedNote ? <div className="dnw-hint">{savedNote}</div> : null}
            </div>
          </>
        )}

        {message ? <div className={`dnw-alert ${message.kind === 'error' ? 'dnw-alert-error' : ''}`}>{message.text}</div> : null}

        {browse ? null : (
          <div className="dnw-footer">
            <button type="button" className="dnw-btn" onClick={cancel}>{t('cancel')}</button>
            <button type="button" className="dnw-btn dnw-btn-primary" onClick={() => void onPrimary()} disabled={working}>
              {working ? (source === 'clone' ? t('cloning') : t('creating')) : primaryLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

async function statPath(path: string | null, setter: (exists: boolean | null) => void): Promise<void> {
  if (!path || !looksFullyQualified(path)) { setter(null); return }
  try {
    const result = await fetchStat(path)
    setter(result.exists)
  } catch {
    setter(null)
  }
}
