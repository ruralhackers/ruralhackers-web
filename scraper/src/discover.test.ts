import { describe, it, expect } from 'vitest'
import { parseSitemapLocs, urlToArchivePath, toCsv } from './discover.ts'

describe('parseSitemapLocs', () => {
  it('extracts loc and lastmod from a urlset', () => {
    const xml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://ruralhackers.com/hacker-days/</loc><lastmod>2026-06-06T11:06:54+00:00</lastmod></url>
  <url><loc>https://ruralhackers.com/about/</loc></url>
</urlset>`
    expect(parseSitemapLocs(xml)).toEqual([
      { loc: 'https://ruralhackers.com/hacker-days/', lastmod: '2026-06-06T11:06:54+00:00' },
      { loc: 'https://ruralhackers.com/about/' },
    ])
  })

  it('extracts child sitemap locations from a sitemapindex', () => {
    const xml = `<sitemapindex><sitemap><loc>https://ruralhackers.com/page-sitemap.xml</loc></sitemap></sitemapindex>`
    expect(parseSitemapLocs(xml)).toEqual([{ loc: 'https://ruralhackers.com/page-sitemap.xml' }])
  })

  it('decodes xml entities in locations', () => {
    const xml = `<urlset><url><loc>https://ruralhackers.com/a/?x=1&amp;y=2</loc></url></urlset>`
    expect(parseSitemapLocs(xml)[0]!.loc).toBe('https://ruralhackers.com/a/?x=1&y=2')
  })

  it('returns an empty array for a sitemap with no urls', () => {
    expect(parseSitemapLocs('<urlset></urlset>')).toEqual([])
  })
})

describe('urlToArchivePath', () => {
  it('maps the site root to index', () => {
    expect(urlToArchivePath('https://ruralhackers.com/')).toBe('index')
  })

  it('strips the trailing slash from a normal path', () => {
    expect(urlToArchivePath('https://ruralhackers.com/hacker-days/')).toBe('hacker-days')
  })

  it('preserves nested paths as directories', () => {
    expect(urlToArchivePath('https://ruralhackers.com/category/uncategorized-en/')).toBe(
      'category/uncategorized-en',
    )
  })

  it('decodes percent-encoded slugs and drops characters illegal in filenames', () => {
    // %ef%bf%bc is U+FFFC OBJECT REPLACEMENT CHARACTER, which wordpress lets
    // into slugs and which cannot go into a filename.
    expect(urlToArchivePath('https://ruralhackers.com/speakers-at-festival-creativa%ef%bf%bc/')).toBe(
      'speakers-at-festival-creativa',
    )
  })
})

describe('toCsv', () => {
  it('writes a header row and quotes fields containing commas and quotes', () => {
    const rows = [{ url: 'https://a.test/', title: 'Hello, "world"' }]
    expect(toCsv(rows, ['url', 'title'])).toBe('url,title\r\nhttps://a.test/,"Hello, ""world"""')
  })

  it('renders missing values as empty fields', () => {
    expect(toCsv([{ url: 'https://a.test/' }], ['url', 'title'])).toBe(
      'url,title\r\nhttps://a.test/,',
    )
  })
})
