import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { writeChecksums } from './checksums.ts'
import { ARCHIVE_DIR } from './config.ts'
import { extractContent, type ArchivedItem } from './content.ts'
import { discoverUrls, toCsv, type SitemapEntry } from './discover.ts'
import { createHttp } from './http.ts'
import { downloadMedia, readRenderedPages, type MediaRecord } from './media.ts'
import { writeMarkdown } from './markdown.ts'
import { writeReport } from './report.ts'
import { snapshotAll, snapshotTargets } from './snapshot.ts'
import { verifyArchive } from './verify.ts'

const OUT = ARCHIVE_DIR
const state = {
  urls: join(OUT, 'seo', 'sitemap-urls.json'),
  items: join(OUT, 'raw', 'items.json'),
  manifest: join(OUT, 'media', 'manifest.json'),
}

const load = async <T>(path: string, what: string): Promise<T> => {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    throw new Error(`missing ${path} — run the ${what} stage first`)
  }
}

const save = async (path: string, data: unknown) => {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8')
}

async function discover(): Promise<SitemapEntry[]> {
  const entries = await discoverUrls(createHttp())
  await save(state.urls, entries)
  await writeFile(
    join(OUT, 'seo', 'sitemap-urls.csv'),
    toCsv(
      entries.map((e) => ({ url: e.loc, source: e.source, lastmod: e.lastmod ?? '' })),
      ['url', 'source', 'lastmod'],
    ),
    'utf8',
  )
  console.log(`discover: ${entries.length} urls`)
  return entries
}

async function content(): Promise<ArchivedItem[]> {
  const items = await extractContent(createHttp(), OUT)
  await save(state.items, items)
  console.log(`content: ${items.length} items`)
  return items
}

async function media(): Promise<MediaRecord[]> {
  const items = await load<ArchivedItem[]>(state.items, 'content')
  // Two sources. Post content finds the images pages embed; the rendered pages
  // find the theme's own assets — the three fonts and the compiled stylesheet —
  // which are in no post content and in no media library listing.
  const rendered = await readRenderedPages(OUT)
  if (rendered.length === 0) {
    console.warn('  no pages-full/ yet — run the snapshot stage first or theme assets are skipped')
  }
  const manifest = await downloadMedia(createHttp(), OUT, [
    ...items.map((i) => i.html),
    ...rendered,
  ])
  const harvested = manifest.filter((m) => m.source === 'harvested').length
  console.log(`media: ${manifest.length} records (${harvested} harvested outside the library)`)
  return manifest
}

async function markdown(): Promise<void> {
  const items = await load<ArchivedItem[]>(state.items, 'content')
  const manifest = await load<MediaRecord[]>(state.manifest, 'media')
  await writeMarkdown(items, manifest, OUT)
  console.log(`markdown: ${items.length} files`)
}

async function snapshot(): Promise<void> {
  const entries = await load<SitemapEntry[]>(state.urls, 'discover')
  const results = await snapshotAll(snapshotTargets(entries), OUT)
  const failed = results.filter((r) => r.status === 'failed')
  const captured = results.filter((r) => r.status === 'captured').length
  const skipped = results.filter((r) => r.status === 'skipped').length
  console.log(
    `snapshot: ${results.length} pages (${captured} captured, ${skipped} already done, ${failed.length} failed)`,
  )
  if (failed.length > 0) {
    for (const f of failed) console.warn(`  failed: ${f.archivePath} — ${f.error}`)
    throw new Error(`snapshot: ${failed.length} page(s) failed`)
  }
}

async function verify(): Promise<void> {
  const problems = await verifyArchive(OUT)
  const errors = problems.filter((p) => p.severity === 'error')
  const warnings = problems.filter((p) => p.severity === 'warning')

  for (const p of warnings) console.warn(`  warn  [${p.rule}] ${p.detail}`)
  for (const p of errors) console.error(`  ERROR [${p.rule}] ${p.detail}`)

  if (errors.length > 0) throw new Error(`verify: ${errors.length} error(s)`)
  const suffix = warnings.length > 0 ? ` (${warnings.length} warning(s), all from the source site)` : ''
  console.log(`verify: archive is complete${suffix}`)
}

const STAGES = {
  discover,
  content,
  media,
  markdown,
  snapshot,
  verify,
  report: async () => {
    console.log(`report: ${await writeReport(OUT)}`)
  },
  checksums: async () => {
    const { path, count, bytes } = await writeChecksums(OUT)
    console.log(`checksums: ${count} files, ${(bytes / 1024 / 1024).toFixed(0)} MB -> ${path}`)
  },
} satisfies Record<string, () => Promise<unknown>>

const arg = process.argv[2] ?? 'all'
/**
 * `snapshot` precedes `media`, unlike the anceu archive.
 *
 * The media stage harvests from `pages-full/`, which snapshot writes, because
 * the theme's fonts and compiled stylesheet are referenced only from a rendered
 * page's inline `<style>`. Dependencies allow the swap: snapshot needs nothing
 * but discover's url list, and reads no media manifest.
 */
const order: (keyof typeof STAGES)[] = [
  'discover',
  'content',
  'snapshot',
  'media',
  'markdown',
  'verify',
  'report',
  'checksums',
]

const toRun = arg === 'all' ? order : [arg as keyof typeof STAGES]
for (const name of toRun) {
  const stage = STAGES[name]
  if (!stage) {
    console.error(`unknown stage "${name}". one of: all, ${order.join(', ')}`)
    process.exit(2)
  }
  console.log(`\n=== ${name} ===`)
  await stage()
}
