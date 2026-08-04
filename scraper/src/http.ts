import { MAX_RETRIES, REQUEST_GAP_MS, USER_AGENT } from './config.ts'

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

export interface Http {
  json<T>(url: string): Promise<T>
  text(url: string): Promise<string>
  buffer(url: string): Promise<Uint8Array>
  head(url: string): Promise<Headers>
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** 4xx other than 429 will never succeed on retry. */
const isRetryable = (status: number) => status === 429 || status >= 500

export function createHttp(
  opts: {
    fetcher?: Fetcher
    gapMs?: number
    retries?: number
  } = {},
): Http {
  const fetcher = opts.fetcher ?? ((u, i) => fetch(u, i))
  const gapMs = opts.gapMs ?? REQUEST_GAP_MS
  const retries = opts.retries ?? MAX_RETRIES

  // A single promise chain keeps every request strictly serial.
  let queue: Promise<unknown> = Promise.resolve()

  async function attempt(url: string, method: 'GET' | 'HEAD'): Promise<Response> {
    let lastError = ''
    for (let i = 0; i < retries; i++) {
      if (i > 0) await sleep(gapMs * 2 ** i)
      const res = await fetcher(url, {
        method,
        headers: { 'user-agent': USER_AGENT, accept: '*/*' },
        redirect: 'follow',
      })
      if (res.ok) return res
      lastError = `HTTP ${res.status} ${res.statusText}`
      if (!isRetryable(res.status)) break
    }
    throw new Error(`${lastError} for ${url}`)
  }

  function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = queue.then(async () => {
      const out = await job()
      await sleep(gapMs)
      return out
    })
    // Keep the chain alive even if this job rejects.
    queue = run.catch(() => undefined)
    return run
  }

  return {
    json: <T>(url: string) =>
      enqueue(async () => (await attempt(url, 'GET')).json() as Promise<T>),
    text: (url) => enqueue(async () => (await attempt(url, 'GET')).text()),
    buffer: (url) =>
      enqueue(async () => new Uint8Array(await (await attempt(url, 'GET')).arrayBuffer())),
    head: (url) => enqueue(async () => (await attempt(url, 'HEAD')).headers),
  }
}
