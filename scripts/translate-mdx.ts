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

const [, , mode, file, mapFile] = process.argv
if (!mode || !file) {
  console.error('usage: translate-mdx.ts extract|apply <file.mdx> [strings.json]')
  process.exit(2)
}

const src = readFileSync(file, 'utf8')

/** Frontmatter fields worth translating; the rest are structural. */
const FRONTMATTER = ['title', 'seoTitle', 'seoDescription', 'summary']

interface Slot {
  kind: 'frontmatter' | 'attr' | 'prose'
  key: string
  text: string
}

function slots(): Slot[] {
  const out: Slot[] = []
  const fm = /^---\n([\s\S]*?)\n---/.exec(src)?.[1] ?? ''
  for (const field of FRONTMATTER) {
    const m = new RegExp(`^${field}:\\s*(.+)$`, 'm').exec(fm)
    if (m) out.push({ kind: 'frontmatter', key: field, text: m[1]!.trim().replace(/^"|"$/g, '') })
  }
  for (const m of src.matchAll(/\b(title|alt|cite)="([^"]+)"/g)) {
    out.push({ kind: 'attr', key: m[1]!, text: m[2]! })
  }
  // Prose bodies: paragraphs inside <Prose> blocks, split on blank lines.
  for (const m of src.matchAll(/<Prose[^>]*>([\s\S]*?)<\/Prose>/g)) {
    for (const para of m[1]!.split(/\n\s*\n/)) {
      const text = para.trim().replace(/\s+/g, ' ')
      if (text.length > 2 && !text.startsWith('<')) out.push({ kind: 'prose', key: 'prose', text })
    }
  }
  return out
}

if (mode === 'extract') {
  const seen = new Map<string, string>()
  for (const s of slots()) if (!seen.has(s.text)) seen.set(s.text, '')
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
  // Longest first, so a short string that is a substring of a longer one cannot
  // corrupt it.
  for (const [en, tr] of Object.entries(map).sort((a, b) => b[0].length - a[0].length)) {
    if (!tr) {
      untranslated.push(en)
      continue
    }
    out = out.split(en).join(tr)
  }
  console.log(out)
  if (untranslated.length > 0) {
    console.error(`${untranslated.length} left in English:`)
    for (const u of untranslated) console.error(`  ${u.slice(0, 70)}`)
  }
} else {
  console.error(`unknown mode "${mode}"`)
  process.exit(2)
}
