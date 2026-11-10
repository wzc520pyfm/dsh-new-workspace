import React, { useEffect, useState } from 'react'
import { isSinglePathSegment, joinHostPath, looksFullyQualified } from '../shared/paths.ts'
import type { MessageKey, UiLocale } from './i18n.ts'
import { translate } from './i18n.ts'

export interface DirectoryEntry { name: string; path: string; hidden?: boolean }
export interface DirectoryListing {
  path: string
  home?: string
  crumbs?: DirectoryEntry[]
  entries?: DirectoryEntry[]
  truncated?: boolean
}

export interface BrowseProps {
  locale: UiLocale
  listDirectory?: (path?: string, signal?: AbortSignal) => Promise<DirectoryListing>
  createDirectory?: (path: string, name: string) => Promise<string>
  mkdir?: (path: string, signal?: AbortSignal) => Promise<void>
  initialPath?: string | null
  onSelect: (path: string) => void
  onCancel: () => void
}

export function DirectoryBrowser(props: BrowseProps): React.ReactElement {
  const t = (key: MessageKey) => translate(props.locale, key)
  const [path, setPath] = useState(props.initialPath ?? '')
  const [typed, setTyped] = useState(props.initialPath ?? '')
  const [listing, setListing] = useState<DirectoryListing | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [newName, setNewName] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const request = looksFullyQualified(path) ? path : undefined
    void (async () => {
      try {
        if (!props.listDirectory) throw new Error(t('browseError'))
        const result = await props.listDirectory(request, controller.signal)
        if (controller.signal.aborted) return
        setListing(result)
        setPath(result.path)
        setTyped(result.path)
        setSelected(result.path)
      } catch (reason) {
        if (controller.signal.aborted) return
        setListing(null)
        setError(reason instanceof Error ? reason.message : t('browseError'))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [path, props.listDirectory])

  const entries = (listing?.entries ?? []).filter(entry => showHidden || !entry.hidden)

  async function createFolder(): Promise<void> {
    const name = newName.trim()
    if (!isSinglePathSegment(name) || !listing?.path) return
    setError(null)
    try {
      let created: string
      if (props.createDirectory) created = await props.createDirectory(listing.path, name)
      else if (props.mkdir) {
        created = joinHostPath(listing.path, name)
        await props.mkdir(created)
      } else throw new Error(t('browseCreateError'))
      setNewName('')
      setPath(created)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('browseCreateError'))
    }
  }

  return (
    <div className="dnw-source">
      <div className="dnw-label">{t('browseTitle')}</div>
      <div className="dnw-crumbs">
        {listing?.home ? <button type="button" onClick={() => setPath(listing.home!)}>{t('browseHome')}</button> : null}
        {(listing?.crumbs ?? []).map(crumb => (
          <span key={crumb.path}>
            <span aria-hidden="true"> / </span>
            <button type="button" onClick={() => setPath(crumb.path)}>{crumb.name}</button>
          </span>
        ))}
      </div>
      <div className="dnw-row">
        <input className="dnw-input" value={typed} onChange={event => setTyped(event.target.value)} spellCheck={false} aria-label={t('typePath')} />
        <button type="button" className="dnw-btn" onClick={() => looksFullyQualified(typed) ? setPath(typed.trim()) : setError(t('browseError'))}>{t('browseEditPath')}</button>
      </div>
      {loading ? <div className="dnw-hint">{t('browseLoading')}</div> : null}
      {error ? <div className="dnw-alert dnw-alert-error">{error}</div> : null}
      <div className="dnw-list" role="listbox">
        {entries.map(entry => (
          <button
            key={entry.path}
            type="button"
            className={entry.hidden ? 'dnw-hidden' : undefined}
            aria-selected={selected === entry.path}
            onClick={() => setSelected(entry.path)}
            onDoubleClick={() => setPath(entry.path)}
          >
            {entry.name}
          </button>
        ))}
      </div>
      {listing?.truncated ? <div className="dnw-hint">{t('browseTruncated')}</div> : null}
      <label className="dnw-hint">
        <input type="checkbox" checked={showHidden} onChange={event => setShowHidden(event.target.checked)} /> {t('browseShowHidden')}
      </label>
      <div className="dnw-row">
        <input className="dnw-input" value={newName} onChange={event => setNewName(event.target.value)} placeholder={t('browseNewFolder')} />
        <button type="button" className="dnw-btn" onClick={() => void createFolder()} disabled={!isSinglePathSegment(newName)}>{t('browseCreate')}</button>
      </div>
      <div className="dnw-footer">
        <button type="button" className="dnw-btn" onClick={props.onCancel}>{t('browseCancel')}</button>
        <button type="button" className="dnw-btn dnw-btn-primary" onClick={() => selected && props.onSelect(selected)} disabled={!selected}>{t('browseOpen')}</button>
      </div>
    </div>
  )
}
