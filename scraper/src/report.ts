import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MediaRecord } from './media.ts'

export async function writeReport(outDir: string): Promise<string> {
  const manifest = JSON.parse(
    await readFile(join(outDir, 'media', 'manifest.json'), 'utf8'),
  ) as MediaRecord[]
  const csv = await readFile(join(outDir, 'seo', 'url-inventory.csv'), 'utf8')
  const urlCount = csv.trim().split('\r\n').length - 1

  // Types come from the files themselves. WordPress reports two plain JPEGs as
  // image/heic, and harvested records have no API metadata at all.
  const typeOf = (m: MediaRecord) => m.actualMime ?? m.mime ?? 'unknown'

  const byMime = new Map<string, number>()
  for (const m of manifest) {
    const t = typeOf(m) || 'unknown'
    byMime.set(t, (byMime.get(t) ?? 0) + 1)
  }

  const harvested = manifest.filter((m) => m.source === 'harvested')
  const images = manifest.filter((m) => typeOf(m).startsWith('image/'))
  const noAlt = images.filter((m) => m.alt.trim() === '')
  const heic = manifest.filter((m) => typeOf(m) === 'image/heic' || typeOf(m) === 'image/heif')
  const mislabelled = manifest.filter(
    (m) => m.actualMime !== null && m.mime !== '' && m.actualMime !== m.mime,
  )
  const brokenAtSource = manifest.filter((m) => m.status === 'missing-at-source')
  const bytes = manifest.reduce((n, m) => n + (m.bytes ?? m.filesize ?? 0), 0)

  const lines = [
    '# Rural Hackers archive inventory',
    '',
    `- URLs in inventory: ${urlCount}`,
    `- Media records: ${manifest.length} (${(bytes / 1024 / 1024).toFixed(0)} MB known)`,
    `- Harvested outside the library listing: ${harvested.length}`,
    '',
    '## Media by type',
    '',
    '_Read from the files themselves, not from WordPress metadata._',
    '',
    ...[...byMime.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Needs attention in phase 2',
    '',
    `- Images with no alt text: ${noAlt.length} of ${images.length} (${Math.round((100 * noAlt.length) / Math.max(images.length, 1))}%)`,
    `- HEIC images needing conversion: ${heic.length}`,
    ...heic.map((m) => `  - ${m.localPath}`),
    '',
    `- Files whose WordPress mime type is wrong: ${mislabelled.length}`,
    ...mislabelled.map((m) => `  - ${m.localPath}: wordpress says ${m.mime}, actually ${m.actualMime}`),
    '',
    '### Already broken on ruralhackers.com',
    '',
    brokenAtSource.length === 0
      ? 'None — every referenced file was served.'
      : `${brokenAtSource.length} file(s) are referenced by the live site but 404. These are`,
    ...(brokenAtSource.length === 0
      ? []
      : [
          'pre-existing breakages, not archive gaps. Fix or drop the references in phase 2.',
          '',
          ...brokenAtSource.map((m) => `- ${m.localPath}`),
        ]),
    '',
    '## Theme assets',
    '',
    "_Referenced only from a rendered page's inline `<style>`. Not in the media",
    'library, not in any post content — harvested from `pages-full/`._',
    '',
    ...manifest
      .filter((m) => /^uploads\/(fonts|siteground-optimizer-assets)\//.test(m.localPath))
      .map((m) => `- ${m.localPath} (${typeOf(m)}, ${m.bytes ?? 0} bytes)`),
    '',
    'The display face is licensed as "OffBit Trial". Phase 2 must buy the',
    'production licence or replace it before going live.',
    '',
    '## Backup',
    '',
    'archive/media is the irreplaceable part and is gitignored because of its',
    'size. Back it up somewhere off this machine before WordPress is switched off.',
    '',
  ]
  const path = join(outDir, 'reports', 'inventory.md')
  await mkdir(join(outDir, 'reports'), { recursive: true })
  await writeFile(path, lines.join('\n'), 'utf8')
  return path
}
