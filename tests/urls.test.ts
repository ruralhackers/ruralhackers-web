import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { oldToNew, PRESERVED, REDIRECTS, renderRedirects } from '../src/lib/urls.ts'

describe('oldToNew', () => {
  it('moves the year pages under /progress/, fixing the slug collision', () => {
    // The page titled "2026" is served at /2025-2-2/ today.
    expect(oldToNew('/2025-2-2/')).toBe('/progress/2026/')
    expect(oldToNew('/2025-2/')).toBe('/progress/2025/')
    expect(oldToNew('/2024-2/')).toBe('/progress/2024/')
    expect(oldToNew('/2023-2/')).toBe('/progress/2023/')
  })

  it('drops the -2 suffix wordpress left on the privacy policy', () => {
    expect(oldToNew('/privacy-policy-2/')).toBe('/privacy-policy/')
  })

  it('sends the junk taxonomy and author archives to the blog', () => {
    expect(oldToNew('/category/uncategorized/')).toBe('/blog/')
    expect(oldToNew('/category/uncategorized-en/')).toBe('/blog/')
    expect(oldToNew('/author/nacho/')).toBe('/blog/')
    // This one also removes a page whose public byline is an email address.
    expect(oldToNew('/author/agustinanceu-com/')).toBe('/blog/')
  })

  it('returns null for a url that must not move', () => {
    expect(oldToNew('/')).toBeNull()
    expect(oldToNew('/hacker-days/')).toBeNull()
    expect(oldToNew('/about/')).toBeNull()
  })
})

describe('the url surface', () => {
  it('accounts for all 22 archived urls', () => {
    expect(PRESERVED.length + REDIRECTS.length).toBe(22)
    expect(PRESERVED).toHaveLength(11)
    expect(REDIRECTS).toHaveLength(11)
  })

  it('retires the two demo blog posts to /blog/, keeping the real one', () => {
    // Both were unedited theme copy about a fictional florist.
    expect(oldToNew('/the-delicate-charm-of-bloodwort-blooms/')).toBe('/blog/')
    expect(oldToNew('/the-story-of-sunflowers-and-their-little-visitors/')).toBe('/blog/')
    expect(oldToNew('/speakers-at-festival-creativa/')).toBeNull()
  })

  it('covers every url in the archived inventory', () => {
    const csv = readFileSync('archive/seo/sitemap-urls.csv', 'utf8')
    const paths = csv
      .trim()
      .split('\r\n')
      .slice(1)
      .map((line) => new URL(line.split(',')[0]!).pathname)
    const known = new Set<string>([...PRESERVED, ...REDIRECTS.map((r) => r.from)])
    const missing = paths.filter((p) => !known.has(p))
    expect(missing).toEqual([])
  })

  it('never redirects a preserved url', () => {
    const preserved = new Set<string>(PRESERVED)
    expect(REDIRECTS.filter((r) => preserved.has(r.from))).toEqual([])
  })

  it('points every redirect at a slashed path', () => {
    expect(REDIRECTS.filter((r) => !r.to.endsWith('/'))).toEqual([])
  })
})

describe('renderRedirects', () => {
  it('emits netlify syntax with 301s', () => {
    const body = renderRedirects()
    expect(body).toContain('/2025-2-2/   /progress/2026/   301')
    expect(body).toContain('/author/nacho/   /blog/   301')
  })

  it('sends a guessed /en/ prefix back to the root', () => {
    // Astro generates no /en/ routes with prefixDefaultLocale: false.
    expect(renderRedirects()).toContain('/en/*   /:splat   301')
  })
})
