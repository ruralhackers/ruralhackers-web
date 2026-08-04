import { describe, it, expect, vi } from 'vitest'
import { createHttp } from './http.ts'
import { USER_AGENT } from './config.ts'

const ok = (body: string) => new Response(body, { status: 200 })

describe('createHttp', () => {
  it('sends the mandatory User-Agent on every request', async () => {
    const fetcher = vi.fn().mockResolvedValue(ok('{"a":1}'))
    const http = createHttp({ fetcher, gapMs: 0 })
    await http.json('https://example.test/x')
    const init = fetcher.mock.calls[0]![1] as RequestInit
    expect(new Headers(init.headers).get('user-agent')).toBe(USER_AGENT)
  })

  it('parses json', async () => {
    const fetcher = vi.fn().mockResolvedValue(ok('{"a":1}'))
    const http = createHttp({ fetcher, gapMs: 0 })
    expect(await http.json<{ a: number }>('https://example.test/x')).toEqual({ a: 1 })
  })

  it('retries on 500 and succeeds', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))
      .mockResolvedValueOnce(ok('{"a":2}'))
    const http = createHttp({ fetcher, gapMs: 0, retries: 2 })
    expect(await http.json<{ a: number }>('https://example.test/x')).toEqual({ a: 2 })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 404 and throws with the url and status', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('gone', { status: 404 }))
    const http = createHttp({ fetcher, gapMs: 0, retries: 3 })
    await expect(http.json('https://example.test/missing')).rejects.toThrow(
      /404.*https:\/\/example\.test\/missing/s,
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('gives up after the retry budget and throws', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('err', { status: 503 }))
    const http = createHttp({ fetcher, gapMs: 0, retries: 2 })
    await expect(http.text('https://example.test/x')).rejects.toThrow(/503/)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('serialises requests with the configured gap', async () => {
    // A fresh Response per call: a body can only be read once, so
    // mockResolvedValue with a single Response fails on the second read.
    const fetcher = vi.fn().mockImplementation(async () => ok('{}'))
    const http = createHttp({ fetcher, gapMs: 30 })
    const start = Date.now()
    await http.json('https://example.test/1')
    await http.json('https://example.test/2')
    expect(Date.now() - start).toBeGreaterThanOrEqual(30)
  })
})
