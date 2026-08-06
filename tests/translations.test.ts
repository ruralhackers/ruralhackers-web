import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { LOCALES, DEFAULT_LOCALE } from '../src/lib/i18n.ts'
import { stringsOf } from '../src/lib/mdx-strings.ts'

const KINDS = ['pages', 'programmes', 'years', 'posts'] as const

/** Strings that are the same in English, Spanish and Galician because they are names. */
const NAMES = new Set([
  'Rural Hackers',
  'Anceu Coliving',
  'Anceu Maker Space',
  'Casa do Pobo de Anceu',
  'Comunidade de Montes de Anceu',
  'Eleven Yellow',
  'WordPress Pontevedra',
  'WordPress.com',
  'Blog',
  'Blog - Rural Hackers',
  'Rosario — Anceu, Ponte Caldelas',
  'Anceu Fest',
  'Rural Hackers, Anceu Fest',
  // Event and project names Rural Hackers coined themselves.
  'Hacker Days',
  'Hacker Days - Rural Hackers',
  'RuralWO',
  'RuralWO - Rural Hackers',
  'A Fuchiqueira',
  'Rural Hackers, A Fuchiqueira',
  'Anceu Monsters',
  'Rural Hackers, Anceu Monsters',
  'TecnoArranxo',
  'Rural Hackers, TecnoArranxo',
  'Green Misions',
  'Entre Culturas',
  'Nova Lonxevidade Rural',
  'Maker Space',
  'Galicia Ilustrada',
  'Rural Hackers Magazine',
  'Reframe Cam',
  'AventuraTech',
  'FemTech',
  'CanTech',
])

/*
 * A translated file that still holds English is the failure mode this whole
 * pipeline is meant to prevent, and it is exactly the one that happened: because
 * `extract` collapses whitespace and `apply` used a literal search, every
 * paragraph wrapped over more than one line was skipped — and skipped silently,
 * because `apply` only reported keys with no translation, never keys it failed
 * to find. Thirty-two paragraphs across four files shipped in English.
 *
 * The tool now reports misses and exits non-zero. This is the belt to that
 * braces: it reads the files as they are on disk, so it catches the case however
 * it got there.
 */
describe('translated content', () => {
  const pairs: { file: string; en: string; locale: string }[] = []
  for (const kind of KINDS) {
    for (const f of readdirSync(`src/content/${kind}/${DEFAULT_LOCALE}`).filter((f) => f.endsWith('.mdx'))) {
      for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
        const file = `src/content/${kind}/${locale}/${f}`
        if (existsSync(file)) pairs.push({ file, en: `src/content/${kind}/${DEFAULT_LOCALE}/${f}`, locale })
      }
    }
  }

  it('has some translated files to check, so an empty sweep cannot pass', () => {
    expect(pairs.length).toBeGreaterThan(10)
  })

  it('holds no english paragraph, heading, title or alt text', () => {
    /*
     * Compared string-for-string against the English source rather than by
     * language detection, and with no length floor — an earlier version exempted
     * anything under forty characters and so passed on a page whose every heading
     * ("Open source", "Adapt the Model", "How to get involved") was still English.
     *
     * What is genuinely identical in all three languages is names, so names are
     * listed rather than inferred. Adding one is a decision: Rural Hackers coin
     * their event names — Hacker Days, FemTech, A Fuchiqueira — and those stay,
     * while the descriptive programme names are translated.
     */
    const offenders: string[] = []
    for (const { file, en } of pairs) {
      const english = new Set(stringsOf(readFileSync(en, 'utf8')))
      for (const s of stringsOf(readFileSync(file, 'utf8'))) {
        // A year page's own title, and a sum of money, are numbers in every language.
        if (/^\d{4}( - Rural Hackers)?$/.test(s) || /^[\d.,]+ euros?$/.test(s)) continue
        if (english.has(s) && !NAMES.has(s)) offenders.push(`${file}: ${s.slice(0, 60)}…`)
      }
    }
    expect(offenders).toEqual([])
  })
})
