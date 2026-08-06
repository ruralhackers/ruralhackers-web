import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { LOCALES, DEFAULT_LOCALE } from '../src/lib/i18n.ts'
import { stringsOf } from '../src/lib/mdx-strings.ts'
import { NAMES, staysEnglish } from '../src/lib/names.ts'

const KINDS = ['pages', 'programmes', 'years', 'posts'] as const


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
     * What is genuinely identical in all three languages is names, and those are
     * listed in src/lib/names.ts rather than inferred here — that file is the
     * policy, this is the enforcement.
     */
    const offenders: string[] = []
    for (const { file, en } of pairs) {
      const english = new Set(stringsOf(readFileSync(en, 'utf8')))
      for (const s of stringsOf(readFileSync(file, 'utf8'))) {
        if (english.has(s) && !staysEnglish(s)) offenders.push(`${file}: ${s.slice(0, 60)}…`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('lists no name that has left the site', () => {
    /*
     * staysEnglish() is a blanket exemption, so a stale entry is a hole in the
     * check above: rename a project and its old name would keep excusing itself
     * forever. Every name must still be findable in the English content.
     */
    const english = KINDS.flatMap((kind) =>
      readdirSync(`src/content/${kind}/${DEFAULT_LOCALE}`)
        .filter((f) => f.endsWith('.mdx'))
        .map((f) => readFileSync(`src/content/${kind}/${DEFAULT_LOCALE}/${f}`, 'utf8')),
    ).join('\n')
    const stale = NAMES.filter((n) => !english.toLowerCase().includes(n.toLowerCase()))
    expect(stale).toEqual([])
  })
})
