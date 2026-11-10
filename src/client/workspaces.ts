import { pathsRoughlyEqual } from '../shared/paths.ts'

export interface WorkspaceRow {
  id: string
  path: string
  title?: string
}

export function normalizeWorkspaces(snapshot: unknown): WorkspaceRow[] {
  if (!snapshot) return []
  const rows: unknown[] = []
  if (Array.isArray(snapshot)) rows.push(...snapshot)
  else if (typeof snapshot === 'object') {
    const obj = snapshot as Record<string, unknown>
    if (Array.isArray(obj.workspaces)) rows.push(...obj.workspaces)
    else if (Array.isArray(obj.items)) rows.push(...obj.items)
    else if (obj.byId && typeof obj.byId === 'object') rows.push(...Object.values(obj.byId as Record<string, unknown>))
    else {
      for (const value of Object.values(obj)) {
        if (value && typeof value === 'object' && ('path' in value || 'directory' in value)) rows.push(value)
      }
    }
  }
  return rows.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const rec = item as Record<string, unknown>
    const path = typeof rec.path === 'string' ? rec.path : typeof rec.directory === 'string' ? rec.directory : ''
    if (!path) return []
    const id = typeof rec.id === 'string' ? rec.id : typeof rec.workspaceId === 'string' ? rec.workspaceId : path
    return [{ id, path, title: typeof rec.title === 'string' ? rec.title : undefined }]
  })
}

export function findWorkspace(rows: readonly WorkspaceRow[], path: string): WorkspaceRow | undefined {
  return rows.find(row => pathsRoughlyEqual(row.path, path))
}
