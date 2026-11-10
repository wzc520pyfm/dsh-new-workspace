const STYLE_ID = 'dsh-new-workspace-styles'

export function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.dnw-root { position: fixed; inset: 0; z-index: 2147483000; display: flex; align-items: center; justify-content: center; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.45; color: #111; }
.dnw-backdrop { position: absolute; inset: 0; background: rgba(16, 18, 21, 0.45); }
.dnw-dialog { position: relative; width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; background: #fff; border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,.22); padding: 18px 20px 16px; display: flex; flex-direction: column; gap: 12px; }
.dnw-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dnw-title { margin: 0; font-size: 18px; font-weight: 650; }
.dnw-header-actions { display: flex; align-items: center; gap: 8px; }
.dnw-lang { display: inline-flex; border: 1px solid #d0d4da; border-radius: 8px; overflow: hidden; }
.dnw-lang button, .dnw-icon-btn, .dnw-btn, .dnw-seg button { font: inherit; cursor: pointer; background: #fff; color: inherit; border: 0; }
.dnw-lang button { padding: 3px 8px; font-size: 12px; }
.dnw-lang button[aria-pressed="true"] { background: #111; color: #fff; }
.dnw-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent; }
.dnw-icon-btn:hover { background: #f2f3f5; }
.dnw-field { display: flex; flex-direction: column; gap: 4px; }
.dnw-label { font-weight: 600; }
.dnw-help, .dnw-preview, .dnw-hint { color: #4b5563; font-size: 12px; }
.dnw-preview code, .dnw-path { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; }
.dnw-input, .dnw-select { width: 100%; box-sizing: border-box; border: 1px solid #c9ced6; border-radius: 8px; padding: 8px 10px; font: inherit; background: #fff; }
.dnw-input:focus, .dnw-select:focus { outline: 2px solid #111; outline-offset: 1px; }
.dnw-input:disabled { background: #f6f7f8; }
.dnw-row { display: flex; gap: 8px; align-items: stretch; }
.dnw-row .dnw-input { flex: 1; }
.dnw-seg { display: flex; border: 1px solid #c9ced6; border-radius: 8px; overflow: hidden; }
.dnw-seg button { flex: 1; padding: 8px 10px; background: #fff; }
.dnw-seg button[aria-pressed="true"] { background: #111; color: #fff; }
.dnw-source { border: 1px solid #e2e5ea; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.dnw-footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 4px; }
.dnw-btn { border-radius: 8px; padding: 8px 14px; border: 1px solid #c9ced6; }
.dnw-btn-primary { background: #111; color: #fff; border-color: #111; }
.dnw-btn-primary:disabled { opacity: .55; cursor: default; }
.dnw-btn:hover:not(:disabled) { filter: brightness(1.05); }
.dnw-alert { border: 1px solid #e3b341; background: #fff8e4; color: #3b2f0a; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.dnw-alert-error { border-color: #e3a3a3; background: #fff1f1; color: #6b1212; }
.dnw-alert strong { display: block; margin-bottom: 2px; }
.dnw-crumbs { display: flex; flex-wrap: wrap; gap: 4px; font-size: 12px; }
.dnw-crumbs button { border: 0; background: none; color: #155eef; cursor: pointer; font: inherit; padding: 0; }
.dnw-list { border: 1px solid #e2e5ea; border-radius: 8px; max-height: 220px; overflow: auto; }
.dnw-list button { display: block; width: 100%; text-align: left; padding: 7px 10px; border: 0; border-bottom: 1px solid #f0f1f3; background: #fff; cursor: pointer; font: inherit; }
.dnw-list button:last-child { border-bottom: 0; }
.dnw-list button:hover, .dnw-list button[aria-selected="true"] { background: #f3f5f8; }
.dnw-hidden { opacity: .7; }
@media (prefers-reduced-motion: reduce) {
  .dnw-dialog, .dnw-backdrop { transition: none; }
}
`
  document.head.appendChild(style)
}
