/**
 * The translatable strings of an MDX entry, in one place.
 *
 * `scripts/translate-mdx.ts` uses this to know what to hand over for translation,
 * and `tests/translations.test.ts` uses the same list to check that a translated
 * file no longer contains any of the English ones. Sharing the definition is the
 * point: a test that used its own idea of "a translatable string" would pass on
 * exactly the paragraphs the tool had missed.
 */

/** Frontmatter fields worth translating; the rest are structural. */
export const FRONTMATTER = ['title', 'seoTitle', 'seoDescription', 'summary'] as const

export interface Slot {
  kind: 'frontmatter' | 'attr' | 'prose' | 'heading' | 'link'
  key: string
  text: string
}

export function slots(src: string): Slot[] {
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
  /*
   * Headings sit outside <Prose>, as literal <h2>/<h3> in the layout markup or as
   * markdown `##`. The first version of this file did not collect them, which is
   * how "Key points of Hacker Days" and a dozen others stayed English in pages
   * whose every paragraph had been translated.
   */
  for (const m of src.matchAll(/<h([1-6])\b[^>]*>([^<>]+)<\/h\1>/g)) {
    const text = m[2]!.trim().replace(/\s+/g, ' ')
    if (text.length > 1) out.push({ kind: 'heading', key: `h${m[1]}`, text })
  }
  for (const m of src.matchAll(/^[ \t]*(#{1,6}) +(.+?)[ \t]*$/gm)) {
    out.push({ kind: 'heading', key: m[1]!, text: m[2]! })
  }
  // Button labels — "Apply", "Read more" — are the other bare text in the layout.
  for (const m of src.matchAll(/<Buttons[^>]*>([\s\S]*?)<\/Buttons>/g)) {
    for (const a of m[1]!.matchAll(/<a\b[^>]*>([^<>]+)<\/a>/g)) {
      const text = a[1]!.trim().replace(/\s+/g, ' ')
      if (text.length > 1) out.push({ kind: 'link', key: 'button', text })
    }
  }
  return out
}

/** The distinct strings of a file, in the order they appear. */
export const stringsOf = (src: string): string[] => [...new Set(slots(src).map((s) => s.text))]
