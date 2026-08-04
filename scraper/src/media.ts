import { mkdir, open, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { BASE_URL, EXPECTED } from './config.ts'
import type { Http } from './http.ts'
import { sniffMime } from './sniff.ts'
import { fetchAll, type WpMedia } from './wp-client.ts'

export interface MediaRecord {
  id: number | null
  url: string
  localPath: string
  mime: string
  alt: string
  caption: string
  width: number | null
  height: number | null
  /** What WordPress claims. Unreliable: it goes stale when a file is re-optimized. */
  filesize: number | null
  /** What the server actually served, recorded at download time. The truth. */
  bytes: number | null
  /**
   * Type read from the file's own leading bytes. Authoritative where `mime`
   * is not: two files WordPress calls image/heic are plain JPEG, and harvested
   * files have no API record to ask.
   */
  actualMime: string | null
  source: 'library' | 'harvested'
  /**
   * Set only when the harvested reference was a resized variant: the canonical
   * original is tried first, and this variant is the fallback if the original
   * turns out not to exist.
   */
  fallbackUrl?: string
  /**
   * `missing-at-source` means the live site references this file but the server
   * does not serve it — a broken image on anceu.com, not a scraper failure. Two
   * pages reference a 2023 logo that 404s. Recording the breakage is the correct
   * outcome; phase 2 fixes or removes those references.
   */
  status: 'downloaded' | 'missing-at-source'
}

/**
 * Percent-decoded form, for comparing references that may or may not be encoded.
 *
 * Disk paths keep the URL's exact encoding, so an image whose filename contains
 * an en dash is stored as `...%E2%80%93...`. But content HTML writes the literal
 * `–`, so a byte comparison says the file is missing when it is sitting right
 * there. Every path comparison goes through this.
 */
export function canonicalPath(pathOrUrl: string): string {
  const clean = pathOrUrl.split('?')[0]!
  try {
    return decodeURIComponent(clean)
  } catch {
    return clean
  }
}

/** Decoded filename only — the comparison key for "do we have this image". */
export function canonicalName(pathOrUrl: string): string {
  return canonicalPath(pathOrUrl).split('/').pop() ?? ''
}

export function uploadPathFromUrl(url: string): string | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  // Hostname, not origin: origin includes the scheme, and the theme emits its
  // @font-face `src` over http:// while BASE_URL is https://. Comparing origins
  // drops all three of the site's fonts.
  if (u.hostname !== new URL(BASE_URL).hostname) return null
  const m = /^\/wp-content\/(uploads\/.+)$/.exec(u.pathname)
  return m?.[1] ?? null
}

/** A real WIDTHxHEIGHT suffix, so WordPress dedup suffixes like -3 survive. */
const SIZE_SUFFIX = /-\d+x\d+(?=\.[a-z0-9]+$)/i

/**
 * The original an upload path is a resized variant of. WordPress generates
 * several sizes per image and `srcset` lists them all, so harvesting raw
 * references would pull ~2000 thumbnails we do not want: Astro generates its own
 * responsive variants from the original.
 */
export function stripSizeSuffix(path: string): string {
  return path.replace(SIZE_SUFFIX, '')
}

const UPLOADS_RE = /https?:\/\/[^\s"'()<>\\]*?\/wp-content\/uploads\/[^\s"'()<>\\,]+/gi

export function harvestUploadUrls(html: string): string[] {
  const found = new Set<string>()
  for (const raw of html.match(UPLOADS_RE) ?? []) {
    const url = raw.replace(/[.,;]+$/, '')
    if (uploadPathFromUrl(url)) found.add(url)
  }
  return [...found]
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').trim()

/** Type of an already-downloaded file, read from its first bytes. */
async function sniffFile(path: string): Promise<string | null> {
  let fh
  try {
    fh = await open(path, 'r')
    const buf = new Uint8Array(512)
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0)
    return sniffMime(buf.subarray(0, bytesRead))
  } catch {
    return null
  } finally {
    await fh?.close()
  }
}

/** Size on disk, or null when the file is absent. */
async function sizeOf(path: string): Promise<number | null> {
  try {
    return (await stat(path)).size
  } catch {
    return null
  }
}

export async function downloadMedia(
  http: Http,
  outDir: string,
  extraHtml: readonly string[],
): Promise<MediaRecord[]> {
  const library = await fetchAll<WpMedia & { id: number }>(http, 'media')
  if (library.length !== EXPECTED.media) {
    throw new Error(
      `media library: expected ${EXPECTED.media} records, got ${library.length}. ` +
        `The live site changed — review before trusting this archive.`,
    )
  }

  const records = new Map<string, MediaRecord>()

  for (const m of library) {
    const path = uploadPathFromUrl(m.source_url)
    if (!path) continue
    records.set(path, {
      id: m.id,
      url: m.source_url,
      localPath: path,
      mime: m.mime_type,
      alt: m.alt_text ?? '',
      caption: stripTags(m.caption?.rendered ?? ''),
      width: m.media_details?.width ?? null,
      height: m.media_details?.height ?? null,
      filesize: m.media_details?.filesize ?? null,
      bytes: null,
      actualMime: null,
      source: 'library',
      status: 'missing-at-source',
    })
  }

  // Second source: anything the site actually references, normalized back to
  // originals. Catches files the library listing omits without hoovering up
  // every srcset thumbnail.
  for (const html of extraHtml) {
    for (const raw of harvestUploadUrls(html)) {
      const url = raw.split('?')[0]!
      const path = uploadPathFromUrl(url)
      if (!path) continue
      const originalPath = stripSizeSuffix(path)
      if (records.has(originalPath) || records.has(path)) continue

      const canonicalUrl = url.replace(SIZE_SUFFIX, '')
      records.set(originalPath, {
        id: null,
        url: canonicalUrl,
        localPath: originalPath,
        mime: '',
        alt: '',
        caption: '',
        width: null,
        height: null,
        filesize: null,
        bytes: null,
        actualMime: null,
        source: 'harvested',
        status: 'missing-at-source',
        ...(canonicalUrl === url ? {} : { fallbackUrl: url }),
      })
    }
  }

  const broken: string[] = []
  for (const rec of records.values()) {
    const dest = join(outDir, 'media', rec.localPath)
    const already = await sizeOf(dest)
    if (already !== null && already > 0) {
      rec.status = 'downloaded' // resumable
      rec.bytes = already
      rec.actualMime = await sniffFile(dest)
      continue
    }
    // Try the canonical original, then the variant the page actually referenced.
    const candidates = [rec.url, ...(rec.fallbackUrl ? [rec.fallbackUrl] : [])]
    let lastWhy = 'no candidate urls'
    let saved = false
    for (const candidate of candidates) {
      try {
        const bytes = await http.buffer(candidate)
        await mkdir(dirname(dest), { recursive: true })
        await writeFile(dest, bytes)
        rec.status = 'downloaded'
        rec.bytes = bytes.byteLength
        rec.actualMime = sniffMime(bytes)
        rec.url = candidate
        saved = true
        break
      } catch (e) {
        lastWhy = e instanceof Error ? e.message : String(e)
      }
    }
    if (!saved) {
      const why = lastWhy
      // A library record that will not download is a genuine failure: the API
      // says it exists. A harvested one is a broken reference on the live site,
      // which the archive records rather than dies on. Every failure is
      // collected so one run surfaces all of them.
      if (rec.source === 'library') {
        throw new Error(`library media ${rec.localPath} failed to download: ${why}`)
      }
      broken.push(`${rec.localPath} (${why})`)
    }
  }
  if (broken.length > 0) {
    console.warn(`  ${broken.length} referenced file(s) missing at source:`)
    for (const b of broken) console.warn(`    ${b}`)
  }

  const manifest = [...records.values()].sort((a, b) => a.localPath.localeCompare(b.localPath))
  await mkdir(join(outDir, 'media'), { recursive: true })
  await writeFile(join(outDir, 'media', 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  return manifest
}
