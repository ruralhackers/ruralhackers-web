import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { EXPECTED, REQUIRED_ASSETS, TEMPLATE_RENDERED_PAGES } from './config.ts'
import { canonicalPath, uploadPathFromUrl, type MediaRecord } from './media.ts'

export interface Problem {
  rule: string
  detail: string
  /**
   * `error` fails the run. `warning` is a fact about the source site that the
   * archive faithfully records and cannot fix — a broken image on ruralhackers.com is
   * not a reason the archive can never pass.
   */
  severity: 'error' | 'warning'
}

const IMAGE_REF = /!\[[^\]]*\]\(([^)\s]+)/g

export function checkReferencedImages(
  markdown: readonly { file: string; body: string }[],
  manifest: readonly MediaRecord[],
): Problem[] {
  // Keyed on the decoded path: disk keeps the URL's encoding (`%E2%80%93`) while
  // content HTML writes the literal character, and they must compare equal.
  const byPath = new Map(manifest.map((m) => [canonicalPath(m.localPath), m]))
  const problems: Problem[] = []
  for (const { file, body } of markdown) {
    for (const m of body.matchAll(IMAGE_REF)) {
      const path = uploadPathFromUrl(m[1]!)
      if (!path) continue
      const rec = byPath.get(canonicalPath(path))
      if (!rec) {
        problems.push({
          rule: 'referenced-image-missing',
          detail: `${file} references ${path}, which is not in the media manifest`,
          severity: 'error',
        })
      } else if (rec.status === 'missing-at-source') {
        problems.push({
          rule: 'broken-at-source',
          detail: `${file} references ${path}, which ruralhackers.com itself does not serve`,
          severity: 'warning',
        })
      }
    }
  }
  return problems
}

const MARKDOWN_SLUG = /(?:^|\/)([^/]+)\.md$/

/**
 * No markdown image may point at a `data:` uri.
 *
 * This rule exists because its absence cost the archive its image references.
 * SiteGround's lazysizes puts a base64 placeholder in `src` and the real file in
 * `data-src`; the markdown stage read `src`, so 151 of 155 references were
 * placeholders. `checkReferencedImages` could not catch it — that rule resolves
 * each reference through `uploadPathFromUrl`, which returns null for a `data:`
 * uri, so every one was skipped and the archive verified clean.
 */
export function checkNoPlaceholderImages(
  markdown: readonly { file: string; body: string }[],
): Problem[] {
  const problems: Problem[] = []
  for (const { file, body } of markdown) {
    for (const _ of body.matchAll(/!\[[^\]]*\]\(data:/g)) {
      problems.push({
        rule: 'placeholder-image-reference',
        detail: `${file} references a data: uri instead of a real image`,
        severity: 'error',
      })
    }
  }
  return problems
}

/**
 * Every archived item must carry prose, with one enumerated exception.
 *
 * The `page_for_posts` target has no body of its own — the theme generates the
 * index — so an empty body there is a fact about WordPress, not a gap in the
 * archive. Any other empty file means content was lost in the transform.
 */
export function checkMarkdownBodies(
  markdown: readonly { file: string; body: string }[],
): Problem[] {
  const templated = new Set<string>(TEMPLATE_RENDERED_PAGES)
  const problems: Problem[] = []
  for (const { file, body } of markdown) {
    const prose = body.replace(/^---[\s\S]*?---\n/, '').trim()
    if (prose !== '') continue
    if (templated.has(MARKDOWN_SLUG.exec(file)?.[1] ?? '')) continue
    problems.push({ rule: 'empty-markdown', detail: `${file} has no body`, severity: 'error' })
  }
  return problems
}

/**
 * The theme's own assets, which no count would catch.
 *
 * The three fonts are not in the media library and not in any page's post
 * content, so `EXPECTED.media` stays satisfied whether they were archived or
 * not. They are the site's entire typography and are unrecoverable once
 * WordPress is off, so their absence is an error, never a warning.
 */
export function checkRequiredAssets(manifest: readonly MediaRecord[]): Problem[] {
  const downloaded = new Set(
    manifest.filter((m) => m.status === 'downloaded').map((m) => canonicalPath(m.localPath)),
  )
  return REQUIRED_ASSETS.filter((p) => !downloaded.has(canonicalPath(p))).map((p) => ({
    rule: 'required-asset-missing',
    detail: `${p} is required by the theme but was not archived`,
    severity: 'error' as const,
  }))
}

export function checkCounts(actual: Readonly<Record<string, number>>): Problem[] {
  const problems: Problem[] = []
  for (const [key, expected] of Object.entries(EXPECTED)) {
    const got = actual[key]
    if (got !== expected) {
      problems.push({
        rule: 'count-mismatch',
        detail: `${key}: expected ${expected}, got ${got}`,
        severity: 'error',
      })
    }
  }
  return problems
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else out.push(p)
  }
  return out
}

export async function verifyArchive(outDir: string): Promise<Problem[]> {
  const problems: Problem[] = []

  const manifestPath = join(outDir, 'media', 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as MediaRecord[]

  // Rule 3: every manifest entry exists on disk at the size the API reported.
  for (const m of manifest) {
    if (m.status === 'missing-at-source') {
      problems.push({
        rule: 'broken-at-source',
        detail: `${m.localPath} is referenced by the site but ruralhackers.com does not serve it`,
        severity: 'warning',
      })
      continue
    }
    const dest = join(outDir, 'media', m.localPath)
    try {
      const s = await stat(dest)
      if (s.size === 0) {
        problems.push({
          rule: 'empty-file',
          detail: `${m.localPath} is zero bytes`,
          severity: 'error',
        })
      } else if (m.bytes !== null && s.size !== m.bytes) {
        // Disk disagreeing with what was actually downloaded means corruption or
        // truncation after the fact. That is a real error.
        problems.push({
          rule: 'size-changed-on-disk',
          detail: `${m.localPath}: downloaded ${m.bytes} bytes, disk now has ${s.size}`,
          severity: 'error',
        })
      } else if (m.filesize && m.bytes !== null && m.filesize !== m.bytes) {
        // WordPress's recorded filesize goes stale when a file is re-optimized;
        // three images disagree by up to 47%, and in every case the server serves
        // exactly what we stored. Worth recording, not worth failing.
        problems.push({
          rule: 'stale-wordpress-filesize',
          detail: `${m.localPath}: wordpress says ${m.filesize} bytes, server served ${m.bytes}`,
          severity: 'warning',
        })
      }
    } catch {
      problems.push({
        rule: 'media-missing',
        detail: `${m.localPath} was never downloaded`,
        severity: 'error',
      })
    }
  }

  // Rules 1 and 2: content present and non-empty for every item.
  const mdFiles = (await walk(join(outDir, 'content'))).filter((f) => f.endsWith('.md'))
  const markdown: { file: string; body: string }[] = []
  for (const f of mdFiles) {
    markdown.push({ file: relative(outDir, f), body: await readFile(f, 'utf8') })
  }
  problems.push(...checkMarkdownBodies(markdown))

  // Rule 4: the assertion that actually protects the archive.
  problems.push(...checkReferencedImages(markdown, manifest))

  // Rule 6: the theme's fonts, which no count protects.
  problems.push(...checkRequiredAssets(manifest))

  // Rule 7: no lazy-loading placeholder survived into the markdown.
  problems.push(...checkNoPlaceholderImages(markdown))

  // Rule 5: counts, against enumerated values.
  const count = async (sub: string) =>
    (await walk(join(outDir, 'raw', sub))).filter((f) => f.endsWith('.json')).length
  const jsonLen = async (file: string) => {
    try {
      return (JSON.parse(await readFile(join(outDir, 'raw', file), 'utf8')) as unknown[]).length
    } catch {
      return -1
    }
  }
  problems.push(
    ...checkCounts({
      pages: await count('pages'),
      posts: await count('posts'),
      categories: await jsonLen('categories.json'),
      tags: await jsonLen('tags.json'),
      users: await jsonLen('users.json'),
      media: manifest.filter((m) => m.source === 'library').length,
    }),
  )

  return problems
}
