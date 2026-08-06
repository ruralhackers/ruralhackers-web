import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'

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

  it('advertises only english on a page that is english-only', () => {
    // /about/ exists in en/ alone, so it must not claim es or gl alternates.
    const about = readFileSync('dist/about/index.html', 'utf8')
    expect(about).toContain('rel="alternate" hreflang="en"')
    expect(about).not.toContain('rel="alternate" hreflang="es"')
  })

  it('keeps the galician tagline in the wording Rural Hackers use themselves', () => {
    // Taken from their own Instagram bio rather than translated here.
    expect(readFileSync('dist/gl/index.html', 'utf8')).toContain(
      'Un movemento para revitalizar a',
    )
  })
})
