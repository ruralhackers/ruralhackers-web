/**
 * Compares, per page, the images the archived WordPress markup references against
 * the ones the built page emits — matched on basename, since Astro fingerprints
 * and re-encodes every file.
 *
 * Written because eyeballing a screenshot does not reliably catch a photograph
 * left out of a section: four of the home page's portraits were missing and the
 * page still looked plausible. This turns "faltan fotos" into a list.
 *
 * Run: bun scripts/check-images.ts
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** archived block html -> built page, for the pages ported so far. */
const PAGES: ReadonlyArray<{ archived: string; built: string }> = [
  { archived: 'archive/html/pages/home.html', built: 'dist/index.html' },
  { archived: 'archive/html/pages/about.html', built: 'dist/about/index.html' },
  { archived: 'archive/html/pages/contact.html', built: 'dist/contact/index.html' },
  {
    archived: 'archive/html/pages/privacy-policy-2.html',
    built: 'dist/privacy-policy/index.html',
  },
  { archived: 'archive/html/pages/ruralwo.html', built: 'dist/ruralwo/index.html' },
  { archived: 'archive/html/pages/hacker-days.html', built: 'dist/hacker-days/index.html' },
  {
    archived: 'archive/html/pages/sharing-knowledge-events.html',
    built: 'dist/sharing-knowledge-events/index.html',
  },
]

/** Strip WordPress's -WIDTHxHEIGHT variant suffix and the extension. */
const stem = (path: string): string => {
  const base = decodeURIComponent(path.split('/').pop()!.split('?')[0]!)
  return base.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '').replace(/\.[a-z0-9]+$/i, '')
}

const archivedImages = (html: string): Set<string> => {
  const out = new Set<string>()
  for (const m of html.matchAll(/(?:src|data-src)="([^"]+)"/g)) {
    const u = m[1]!
    if (u.startsWith('data:') || !u.includes('/wp-content/uploads/')) continue
    out.add(stem(u))
  }
  return out
}

const builtImages = (html: string): Set<string> => {
  const out = new Set<string>()
  // Astro emits /_astro/<name>.<hash>.<ext>, sometimes with a second hash.
  for (const m of html.matchAll(/\/_astro\/([^"'\s,)]+)/g)) {
    const base = m[1]!.split('/').pop()!
    out.add(base.replace(/\.[A-Za-z0-9_-]{6,}(?:_[A-Za-z0-9_-]+)?\.[a-z0-9]+$/, ''))
  }
  return out
}

let missingTotal = 0
for (const { archived, built } of PAGES) {
  let a: Set<string>
  let b: Set<string>
  try {
    a = archivedImages(readFileSync(archived, 'utf8'))
    statSync(built)
    b = builtImages(readFileSync(built, 'utf8'))
  } catch {
    console.log(`\n${built}\n  (not built yet — skipped)`)
    continue
  }
  const missing = [...a].filter((s) => !b.has(s))
  missingTotal += missing.length
  const mark = missing.length === 0 ? '✓' : '✗'
  console.log(`\n${mark} ${built}  archived=${a.size} built=${b.size}`)
  for (const m of missing) console.log(`    MISSING  ${m}`)
}

console.log(`\ntotal missing: ${missingTotal}`)
if (missingTotal > 0) process.exitCode = 1
