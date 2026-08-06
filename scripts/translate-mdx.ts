/**
 * Splits the mechanics of translating a Milestone page from the translation itself.
 *
 * The year pages are 67 milestones between them, and each has a title, an alt text
 * and a body. Hand-editing MDX 134 times to change only the prose is how structure
 * gets broken and images get separated from their captions — this touches nothing
 * but the strings.
 *
 * Run: bun scripts/translate-mdx.ts extract <file.mdx> > strings.json
 *      bun scripts/translate-mdx.ts apply <file.mdx> <strings.json> > out.mdx
 *
 * The json is a flat { "english": "translation" } map. Any key left empty, or
 * absent, keeps the English and is reported, so nothing is silently half-done.
 */
import { readFileSync } from 'node:fs'
import { slots } from '../src/lib/mdx-strings.ts'

const [, , mode, file, mapFile] = process.argv
if (!mode || !file) {
  console.error('usage: translate-mdx.ts extract|apply <file.mdx> [strings.json]')
  process.exit(2)
}

const src = readFileSync(file, 'utf8')

if (mode === 'extract') {
  const seen = new Map<string, string>()
  for (const s of slots(src)) if (!seen.has(s.text)) seen.set(s.text, '')
  console.log(JSON.stringify(Object.fromEntries(seen), null, 2))
  console.error(`${seen.size} strings`)
} else if (mode === 'apply') {
  if (!mapFile) {
    console.error('apply needs a strings.json')
    process.exit(2)
  }
  const map = JSON.parse(readFileSync(mapFile, 'utf8')) as Record<string, string>
  let out = src
  const untranslated: string[] = []
  const notFound: string[] = []
  // Longest first, so a short string that is a substring of a longer one cannot
  // corrupt it.
  for (const [en, tr] of Object.entries(map).sort((a, b) => b[0].length - a[0].length)) {
    if (!tr) {
      untranslated.push(en)
      continue
    }
    /*
     * `extract` collapses whitespace, so a paragraph wrapped over several lines —
     * every bullet list on the site — never matched a literal search, and the old
     * `split/join` said nothing when it matched nothing. Match tolerantly instead,
     * and count the misses.
     */
    const pattern = new RegExp(
      en
        .split(/\s+/)
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('\\s+'),
      'g',
    )
    let hits = 0
    out = out.replace(pattern, (match, offset: number) => {
      hits += 1
      // Re-indent onto the block being replaced, so a translated bullet list keeps
      // the nesting MDX needs.
      const lineStart = out.lastIndexOf('\n', offset - 1) + 1
      const indent = /^[ \t]*/.exec(out.slice(lineStart, offset))?.[0] ?? ''
      return match.includes('\n') || tr.includes('\n')
        ? tr.split('\n').join(`\n${indent}`)
        : tr
    })
    if (hits === 0) notFound.push(en)
  }
  console.log(out)
  if (untranslated.length > 0) {
    console.error(`${untranslated.length} left in English:`)
    for (const u of untranslated) console.error(`  ${u.slice(0, 70)}`)
  }
  if (notFound.length > 0) {
    console.error(`${notFound.length} not found in the source:`)
    for (const u of notFound) console.error(`  ${u.slice(0, 70)}`)
  }
  if (untranslated.length + notFound.length > 0) process.exit(1)
} else {
  console.error(`unknown mode "${mode}"`)
  process.exit(2)
}
