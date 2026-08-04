import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { EXPECTED, POST_TYPES } from './config.ts'
import { toCsv, urlToArchivePath } from './discover.ts'
import { decodeEntities } from './html-entities.ts'
import type { Http } from './http.ts'
import { fetchAll, type WpItem } from './wp-client.ts'

export interface ArchivedItem {
  kind: 'pages' | 'posts'
  id: number
  slug: string
  url: string
  archivePath: string
  title: string
  html: string
  seo: Record<string, unknown>
}

const SEO_COLUMNS = [
  'url',
  'kind',
  'id',
  'slug',
  'archive_path',
  'title',
  'description',
  'canonical',
  'robots',
  'og_title',
] as const

/**
 * Entities are decoded here because this row is the contract phase 2 compares
 * its own output against, and the browser shows `&`, not `&amp;`. The verbatim
 * value is still preserved in `raw/`.
 */
const str = (v: unknown): string => (typeof v === 'string' ? decodeEntities(v) : '')

export function seoRow(item: ArchivedItem): Record<string, string> {
  const s = item.seo
  const robots = s['robots']
  return {
    url: item.url,
    kind: item.kind,
    id: String(item.id),
    slug: item.slug,
    archive_path: item.archivePath,
    title: str(s['title']) || decodeEntities(item.title),
    description: str(s['description']),
    canonical: str(s['canonical']),
    robots:
      robots && typeof robots === 'object'
        ? Object.values(robots as Record<string, unknown>).map(str).filter(Boolean).join(', ')
        : str(robots),
    og_title: str(s['og_title']),
  }
}

async function write(path: string, body: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, body, 'utf8')
}

export async function extractContent(http: Http, outDir: string): Promise<ArchivedItem[]> {
  const items: ArchivedItem[] = []

  for (const [kind, endpoint] of Object.entries(POST_TYPES) as [ArchivedItem['kind'], string][]) {
    const raw = await fetchAll<WpItem>(http, endpoint)
    const expected = EXPECTED[kind]
    if (raw.length !== expected) {
      throw new Error(`${kind}: expected ${expected} items, got ${raw.length}`)
    }

    for (const r of raw) {
      // `link` is authoritative. The page slugged `home` is served at "/".
      const archivePath = urlToArchivePath(r.link)
      const html = r.content?.rendered ?? ''
      if (html.trim() === '') throw new Error(`${kind}/${r.slug}: empty content`)

      items.push({
        kind,
        id: r.id,
        slug: r.slug,
        url: r.link,
        archivePath,
        title: r.title.rendered,
        html,
        seo: r.yoast_head_json ?? {},
      })

      await write(join(outDir, 'raw', kind, `${r.slug}.json`), JSON.stringify(r, null, 2))
      await write(join(outDir, 'html', kind, `${r.slug}.html`), html)
      await write(
        join(outDir, 'seo', 'yoast', kind, `${r.slug}.json`),
        JSON.stringify(r.yoast_head_json ?? {}, null, 2),
      )
    }
  }

  // Taxonomies and authors: reference data for phase 2 archives and bylines.
  for (const [name, endpoint] of [
    ['categories', 'categories'],
    ['tags', 'tags'],
    ['users', 'users'],
  ] as const) {
    const rows = await fetchAll<{ id: number }>(http, endpoint)
    const expected = EXPECTED[name]
    if (rows.length !== expected) {
      throw new Error(`${name}: expected ${expected}, got ${rows.length}`)
    }
    await write(join(outDir, 'raw', `${name}.json`), JSON.stringify(rows, null, 2))
  }

  await write(join(outDir, 'seo', 'url-inventory.csv'), toCsv(items.map(seoRow), SEO_COLUMNS))
  return items
}
