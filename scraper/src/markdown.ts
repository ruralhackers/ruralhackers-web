import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import TurndownService from 'turndown'
import { decodeEntities } from './html-entities.ts'
import { canonicalName, type MediaRecord } from './media.ts'

export interface ArchivedItemLike {
  kind: string
  id: number
  slug: string
  url: string
  title: string
  html: string
  seo: Record<string, unknown>
}

/** Matches only a real WIDTHxHEIGHT suffix, so dedup suffixes like -3 survive. */
const SIZE_SUFFIX = /-\d+x\d+(?=\.[a-z0-9]+$)/i

export function basenameOf(url: string): string {
  return url.split('?')[0]!.split('/').pop() ?? ''
}

/**
 * Comparison uses the percent-decoded filename: content HTML writes a literal
 * en dash where the manifest path carries `%E2%80%93`, and treating those as
 * different names left resized variants unrewritten.
 */
export function normalizeUploadUrl(src: string, knownBasenames: ReadonlySet<string>): string {
  const stripped = src.replace(SIZE_SUFFIX, '')
  return stripped !== src && knownBasenames.has(canonicalName(stripped)) ? stripped : src
}

export function htmlToMarkdown(html: string, knownBasenames: ReadonlySet<string>): string {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' })

  td.addRule('figureWithCaption', {
    filter: 'figure',
    replacement: (_content, node) => {
      const el = node as unknown as Element
      const img = el.querySelector('img')
      if (!img) return ''
      const src = normalizeUploadUrl(img.getAttribute('src') ?? '', knownBasenames)
      const alt = img.getAttribute('alt') ?? ''
      const caption = el.querySelector('figcaption')?.textContent?.trim() ?? ''
      const image = `![${alt}](${src})`
      return caption ? `\n\n${image}\n*${caption}*\n\n` : `\n\n${image}\n\n`
    },
  })

  td.addRule('normalizedImage', {
    filter: 'img',
    replacement: (_content, node) => {
      const el = node as unknown as Element
      const src = normalizeUploadUrl(el.getAttribute('src') ?? '', knownBasenames)
      if (!src) return ''
      return `![${el.getAttribute('alt') ?? ''}](${src})`
    },
  })

  return td.turndown(html).trim()
}

export function frontmatter(fields: Record<string, unknown>): string {
  const lines: string[] = []
  const quote = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue
    if (Array.isArray(v)) lines.push(`${k}: [${v.map((x) => quote(String(x))).join(', ')}]`)
    else if (typeof v === 'string') lines.push(`${k}: ${quote(v)}`)
    else lines.push(`${k}: ${String(v)}`)
  }
  return `---\n${lines.join('\n')}\n---\n`
}

export async function writeMarkdown(
  items: readonly ArchivedItemLike[],
  media: readonly MediaRecord[],
  outDir: string,
): Promise<void> {
  const known = new Set(media.map((m) => canonicalName(m.localPath)))
  for (const item of items) {
    const body = htmlToMarkdown(item.html, known)
    const seo = item.seo
    const doc =
      frontmatter({
        title: decodeEntities(item.title),
        wpId: item.id,
        slug: item.slug,
        url: item.url,
        seoTitle: typeof seo['title'] === 'string' ? decodeEntities(seo['title']) : null,
        seoDescription:
          typeof seo['description'] === 'string' ? decodeEntities(seo['description']) : null,
        canonical: typeof seo['canonical'] === 'string' ? seo['canonical'] : null,
      }) +
      '\n' +
      body +
      '\n'
    const path = join(outDir, 'content', item.kind, `${item.slug}.md`)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, doc, 'utf8')
  }
}
