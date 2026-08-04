import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LOCALE,
  dropdownTargets,
  localeLabel,
  localePath,
  LOCALES,
} from '../src/lib/i18n.ts'

describe('locales', () => {
  it('lists the three languages with english as default', () => {
    expect(LOCALES).toEqual(['en', 'es', 'gl'])
    expect(DEFAULT_LOCALE).toBe('en')
  })

  it('labels them for the dropdown', () => {
    expect(localeLabel('en')).toBe('EN')
    expect(localeLabel('es')).toBe('ES')
    expect(localeLabel('gl')).toBe('GL')
  })
})

describe('localePath', () => {
  it('leaves english unprefixed, because all indexed urls are at the root', () => {
    expect(localePath('en', '/hacker-days/')).toBe('/hacker-days/')
    expect(localePath('en', '/')).toBe('/')
  })

  it('prefixes the other two', () => {
    expect(localePath('es', '/hacker-days/')).toBe('/es/hacker-days/')
    expect(localePath('gl', '/hacker-days/')).toBe('/gl/hacker-days/')
  })

  it('keeps the root slashed when prefixing', () => {
    expect(localePath('es', '/')).toBe('/es/')
    expect(localePath('gl', '/')).toBe('/gl/')
  })
})

describe('dropdownTargets', () => {
  it('links straight to a translation that exists', () => {
    const t = dropdownTargets('en', '/hacker-days/', ['en', 'es'])
    expect(t.find((x) => x.locale === 'es')!.href).toBe('/es/hacker-days/')
  })

  it('falls back to the locale home when the translation is missing', () => {
    // Never a 404, and never english served under an /es/ url.
    const t = dropdownTargets('en', '/hacker-days/', ['en'])
    expect(t.find((x) => x.locale === 'es')!.href).toBe('/es/')
    expect(t.find((x) => x.locale === 'gl')!.href).toBe('/gl/')
  })

  it('always offers all three languages', () => {
    expect(dropdownTargets('en', '/about/', ['en'])).toHaveLength(3)
  })

  it('marks the current locale', () => {
    const t = dropdownTargets('es', '/es/about/', ['en', 'es'])
    expect(t.filter((x) => x.isCurrent).map((x) => x.locale)).toEqual(['es'])
  })

  it('treats a path already carrying a prefix as the unprefixed one', () => {
    const t = dropdownTargets('es', '/es/about/', ['en', 'es'])
    expect(t.find((x) => x.locale === 'en')!.href).toBe('/about/')
  })
})
