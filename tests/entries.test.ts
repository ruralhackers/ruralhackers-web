import { describe, it, expect } from 'vitest'
import { localesFor, pathFor, splitId } from '../src/lib/entries.ts'

describe('splitId', () => {
  it('reads the locale out of the entry id', () => {
    expect(splitId('en/about')).toEqual({ locale: 'en', slug: 'about' })
    expect(splitId('gl/hacker-days')).toEqual({ locale: 'gl', slug: 'hacker-days' })
  })

  it('treats a bare id as the default locale', () => {
    expect(splitId('about')).toEqual({ locale: 'en', slug: 'about' })
  })
})

describe('localesFor', () => {
  it('finds which languages an entry exists in', () => {
    expect(localesFor(['en/about', 'es/about', 'en/contact'], 'about')).toEqual(['en', 'es'])
  })

  it('returns just english when nothing is translated yet', () => {
    expect(localesFor(['en/about'], 'about')).toEqual(['en'])
  })

  it('keeps locale order stable for the dropdown', () => {
    expect(localesFor(['gl/x', 'en/x', 'es/x'], 'x')).toEqual(['en', 'es', 'gl'])
  })
})

describe('pathFor', () => {
  it('serves the front page at the root, not at its slug', () => {
    // The wordpress page slugged `home` was served at "/". Keep it there.
    expect(pathFor('pages', 'home')).toBe('/')
  })

  it('keeps the other pages and every programme at the root level', () => {
    expect(pathFor('pages', 'about')).toBe('/about/')
    expect(pathFor('programmes', 'hacker-days')).toBe('/hacker-days/')
  })

  it('moves the years under /progress/', () => {
    expect(pathFor('years', '2026')).toBe('/progress/2026/')
  })

  it('keeps posts at the root, where they are indexed', () => {
    expect(pathFor('posts', 'speakers-at-festival-creativa')).toBe(
      '/speakers-at-festival-creativa/',
    )
  })
})
