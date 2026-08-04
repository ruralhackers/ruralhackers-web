import { describe, it, expect, vi } from 'vitest'
import { fetchAll } from './wp-client.ts'
import type { Http } from './http.ts'

function fakeHttp(pages: Record<string, unknown>): Http {
  return {
    json: vi.fn(async (url: string) => {
      const page = new URL(url).searchParams.get('page') ?? '1'
      if (!(page in pages)) {
        throw new Error(`HTTP 400 Bad Request for ${url}`)
      }
      return pages[page]
    }) as Http['json'],
    text: vi.fn() as Http['text'],
    buffer: vi.fn() as Http['buffer'],
    head: vi.fn() as Http['head'],
  }
}

describe('fetchAll', () => {
  it('concatenates every page until one comes back empty', async () => {
    const http = fakeHttp({ 1: [{ id: 1 }, { id: 2 }], 2: [{ id: 3 }], 3: [] })
    expect(await fetchAll<{ id: number }>(http, 'posts')).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  })

  it('stops cleanly on the invalid-page-number error rather than throwing', async () => {
    // WordPress returns HTTP 400 rest_post_invalid_page_number past the last page.
    const http = fakeHttp({ 1: [{ id: 1 }] })
    expect(await fetchAll<{ id: number }>(http, 'media')).toEqual([{ id: 1 }])
  })

  it('passes through extra query params and requests 100 per page', async () => {
    const http = fakeHttp({ 1: [] })
    await fetchAll(http, 'posts', { _fields: 'id,slug' })
    const url = new URL(vi.mocked(http.json).mock.calls[0]![0])
    expect(url.pathname).toBe('/wp-json/wp/v2/posts')
    expect(url.searchParams.get('per_page')).toBe('100')
    expect(url.searchParams.get('_fields')).toBe('id,slug')
  })

  it('deduplicates by id, because media pagination can repeat records', async () => {
    const http = fakeHttp({ 1: [{ id: 1 }, { id: 2 }], 2: [{ id: 2 }, { id: 3 }], 3: [] })
    expect(await fetchAll<{ id: number }>(http, 'media')).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  })

  it('rethrows a genuine error', async () => {
    const http: Http = {
      json: vi.fn(async () => {
        throw new Error('HTTP 500 Server Error for x')
      }) as Http['json'],
      text: vi.fn() as Http['text'],
      buffer: vi.fn() as Http['buffer'],
      head: vi.fn() as Http['head'],
    }
    await expect(fetchAll(http, 'posts')).rejects.toThrow(/500/)
  })
})
