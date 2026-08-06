import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { LOCALES } from '../src/lib/i18n.ts'

/** Where the English build of a given entry lands, or null if it has its own route. */
const builtPathFor = (kind: string, slug: string): string | null => {
  if (kind === 'years') return `dist/progress/${slug}/index.html`
  if (slug === 'home') return 'dist/index.html'
  if (slug === 'blog') return 'dist/blog/index.html'
  return `dist/${slug}/index.html`
}

describe('prefixed locale homes', () => {
  it('builds /es/ and /gl/, which the language links fall back to', () => {
    // Without these, every ES or GL click from any of the fourteen English-only
    // pages lands on a 404, because the fallback for an untranslated page is that
    // locale's home.
    expect(existsSync('dist/es/index.html')).toBe(true)
    expect(existsSync('dist/gl/index.html')).toBe(true)
  })

  it('declares the right language on each', () => {
    expect(readFileSync('dist/es/index.html', 'utf8')).toContain('lang="es"')
    expect(readFileSync('dist/gl/index.html', 'utf8')).toContain('lang="gl"')
  })

  it('does not serve english under a prefixed url', () => {
    // `fallback` is unset in astro.config precisely so this cannot happen. A
    // marker phrase from the English home must not appear in either translation.
    const marker = 'A movement for the revitalization'
    expect(readFileSync('dist/es/index.html', 'utf8')).not.toContain(marker)
    expect(readFileSync('dist/gl/index.html', 'utf8')).not.toContain(marker)
  })

  it('canonicalises each to its own prefixed url', () => {
    expect(readFileSync('dist/es/index.html', 'utf8')).toContain(
      'rel="canonical" href="https://ruralhackers.com/es/"',
    )
    expect(readFileSync('dist/gl/index.html', 'utf8')).toContain(
      'rel="canonical" href="https://ruralhackers.com/gl/"',
    )
  })

  it('advertises all three hreflangs on the home, which exists in all three', () => {
    const en = readFileSync('dist/index.html', 'utf8')
    for (const l of ['en', 'es', 'gl']) {
      expect(en).toContain(`rel="alternate" hreflang="${l}"`)
    }
  })

  it('advertises exactly the locales each page exists in', () => {
    /*
     * Checked as an invariant rather than against a named page. Two earlier
     * versions of this test pinned /about/ and then /hacker-days/ as the
     * english-only example, and each broke the moment that page was translated —
     * the test was tracking the translation backlog instead of the rule.
     */
    const kinds = ['pages', 'programmes', 'years', 'posts'] as const
    const offenders: string[] = []
    for (const kind of kinds) {
      const dir = `src/content/${kind}`
      const enFiles = readdirSync(`${dir}/en`).filter((f) => f.endsWith('.mdx'))
      for (const f of enFiles) {
        const slug = f.replace(/\.mdx$/, '')
        const locales = LOCALES.filter((l) => existsSync(`${dir}/${l}/${slug}.mdx`))
        const built = builtPathFor(kind, slug)
        if (!built || !existsSync(built)) continue
        const html = readFileSync(built, 'utf8')
        for (const l of LOCALES) {
          const claims = html.includes(`rel="alternate" hreflang="${l}"`)
          const exists = locales.includes(l)
          if (claims !== exists) {
            offenders.push(`${built}: hreflang ${l} ${claims ? 'claimed' : 'missing'}, file ${exists ? 'exists' : 'absent'}`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('keeps the galician tagline in the wording Rural Hackers use themselves', () => {
    // Taken from their own Instagram bio rather than translated here.
    expect(readFileSync('dist/gl/index.html', 'utf8')).toContain(
      'Un movemento para revitalizar a',
    )
  })
})
