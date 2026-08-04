import { BASE_URL } from './config.ts'
import { decodeEntities } from './html-entities.ts'
import type { Http } from './http.ts'

export interface SitemapEntry {
  loc: string
  lastmod?: string
  source: string
}

export function parseSitemapLocs(xml: string): { loc: string; lastmod?: string }[] {
  const blocks = xml.match(/<(?:url|sitemap)\b[\s\S]*?<\/(?:url|sitemap)>/g) ?? []
  const out: { loc: string; lastmod?: string }[] = []
  for (const b of blocks) {
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(b)?.[1]?.trim()
    if (!loc) continue
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(b)?.[1]?.trim()
    out.push(lastmod ? { loc: decodeEntities(loc), lastmod } : { loc: decodeEntities(loc) })
  }
  return out
}

/** Characters that are illegal or invisible in filenames. */
const UNSAFE = /[\u0000-\u001f\u007f\ufeff\uFFFC\uFFFD<>:"\\|?*]/g

export function urlToArchivePath(url: string): string {
  const path = decodeURIComponent(new URL(url).pathname)
    .replace(/^\/+|\/+$/g, '')
    .replace(UNSAFE, '')
  return path === '' ? 'index' : path
}

export function toCsv(
  rows: readonly Record<string, string>[],
  columns: readonly string[],
): string {
  const cell = (v: string | undefined) => {
    const s = v ?? ''
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join(
    '\r\n',
  )
}

export async function discoverUrls(http: Http): Promise<SitemapEntry[]> {
  const indexXml = await http.text(`${BASE_URL}/sitemap_index.xml`)
  const children = parseSitemapLocs(indexXml).map((e) => e.loc)
  if (children.length === 0) throw new Error('sitemap_index.xml yielded no child sitemaps')

  const entries: SitemapEntry[] = []
  for (const child of children) {
    const source = new URL(child).pathname.replace(/^\/|-sitemap\.xml$/g, '')
    for (const e of parseSitemapLocs(await http.text(child))) {
      entries.push({ ...e, source })
    }
  }
  return entries
}
