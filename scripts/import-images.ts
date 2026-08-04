/**
 * Copies the images `archive/content/` references into `src/assets/images/`,
 * preserving their uploads-relative path.
 *
 * The archive holds 234 media files but the site references far fewer, and
 * `archive/media/` is gitignored for size. Only what the pages actually use
 * belongs in the repo, and the content markdown is the authority on which those
 * are — which is only true since the lazysizes placeholders were fixed.
 *
 * Run: bun scripts/import-images.ts
 */
import { mkdir, copyFile, readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const CONTENT = 'archive/content'
const MEDIA = 'archive/media'
const DEST = 'src/assets/images'

const walk = async (dir: string): Promise<string[]> => {
  const out: string[] = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (e.name.endsWith('.md')) out.push(p)
  }
  return out
}

const uploadsPath = (url: string): string | null => {
  const m = /\/wp-content\/(uploads\/[^\s)"']+)/.exec(url)
  if (!m) return null
  try {
    return decodeURIComponent(m[1]!.split('?')[0]!)
  } catch {
    return m[1]!.split('?')[0]!
  }
}

const referenced = new Set<string>()
for (const file of await walk(CONTENT)) {
  const body = await readFile(file, 'utf8')
  for (const m of body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
    const p = uploadsPath(m[1]!)
    if (p) referenced.add(p)
  }
}

let copied = 0
const missing: string[] = []
for (const path of [...referenced].sort()) {
  const from = join(MEDIA, path)
  const to = join(DEST, path.replace(/^uploads\//, ''))
  try {
    await stat(from)
  } catch {
    missing.push(path)
    continue
  }
  await mkdir(dirname(to), { recursive: true })
  await copyFile(from, to)
  copied++
}

console.log(`referenced: ${referenced.size}`)
console.log(`copied:     ${copied} -> ${DEST}`)
if (missing.length > 0) {
  console.warn(`missing from archive/media (${missing.length}):`)
  for (const m of missing) console.warn(`  ${m}`)
}
