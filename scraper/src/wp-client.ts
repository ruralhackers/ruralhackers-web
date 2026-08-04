import { BASE_URL } from './config.ts'
import type { Http } from './http.ts'

export interface WpRendered {
  rendered: string
}

export interface WpItem {
  id: number
  slug: string
  link: string
  type?: string
  date?: string
  modified?: string
  title: WpRendered
  content?: WpRendered
  excerpt?: WpRendered
  author?: number
  featured_media?: number
  categories?: number[]
  tags?: number[]
  yoast_head_json?: Record<string, unknown>
  [k: string]: unknown
}

export interface WpMedia {
  id: number
  slug: string
  source_url: string
  mime_type: string
  alt_text?: string
  caption?: WpRendered
  media_details?: { width?: number; height?: number; filesize?: number }
}

const PER_PAGE = 100

/** Past the last page WordPress answers 400 rest_post_invalid_page_number. */
const isPastEnd = (e: unknown) => e instanceof Error && /\b400\b/.test(e.message)

export async function fetchAll<T extends { id: number }>(
  http: Http,
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const byId = new Map<number, T>()
  for (let page = 1; ; page++) {
    const url = new URL(`${BASE_URL}/wp-json/wp/v2/${endpoint}`)
    url.searchParams.set('per_page', String(PER_PAGE))
    url.searchParams.set('page', String(page))
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

    let batch: T[]
    try {
      batch = await http.json<T[]>(url.toString())
    } catch (e) {
      if (isPastEnd(e)) break
      throw e
    }
    if (!Array.isArray(batch) || batch.length === 0) break
    for (const item of batch) byId.set(item.id, item)
  }
  return [...byId.values()]
}
