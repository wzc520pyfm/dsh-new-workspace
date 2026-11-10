export interface RequestLike {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  on?(event: string, listener: (...args: unknown[]) => void): void
}

export interface ResponseLike {
  writeHead(status: number, headers: Record<string, string>): void
  end(body?: string): void
}

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export function header(headers: RequestLike['headers'], name: string): string {
  const raw = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(raw)) return raw.join(',')
  return raw ?? ''
}

export function isSameOrigin(headers: RequestLike['headers']): boolean {
  const origin = header(headers, 'origin').trim()
  if (!origin) return true
  const host = header(headers, 'host').trim()
  if (!host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function sendJson(res: ResponseLike, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

export function sendError(res: ResponseLike, status: number, code: string, message: string): void {
  sendJson(res, status, { ok: false, error: { code, message } })
}

export async function readJsonBody(req: NodeJS.ReadableStream, limit = 1_000_000): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > limit) throw new HttpError(413, 'payload_too_large', 'Request body is too large')
    chunks.push(buf)
  }
  if (chunks.length === 0) return {}
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Expected a JSON object')
    }
    return parsed as Record<string, unknown>
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be a JSON object')
  }
}
