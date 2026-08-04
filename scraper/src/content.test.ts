import { describe, it, expect } from 'vitest'
import { seoRow, type ArchivedItem } from './content.ts'

const item: ArchivedItem = {
  kind: 'pages',
  id: 13,
  slug: 'home',
  url: 'https://ruralhackers.com/',
  archivePath: 'index',
  title: 'Rural Hackers',
  html: '<p>hi</p>',
  seo: {
    title: 'Rural Hackers – A movement for the revitalization of rural life',
    description: 'A movement for the revitalization of rural life',
    canonical: 'https://ruralhackers.com/',
    robots: { index: 'index', follow: 'follow' },
    og_title: 'Rural Hackers',
  },
}

describe('seoRow', () => {
  it('flattens the fields phase 2 is validated against', () => {
    expect(seoRow(item)).toEqual({
      url: 'https://ruralhackers.com/',
      kind: 'pages',
      id: '13',
      slug: 'home',
      archive_path: 'index',
      title: 'Rural Hackers – A movement for the revitalization of rural life',
      description: 'A movement for the revitalization of rural life',
      canonical: 'https://ruralhackers.com/',
      robots: 'index, follow',
      og_title: 'Rural Hackers',
    })
  })

  it('falls back to the post title when yoast has none', () => {
    const bare: ArchivedItem = { ...item, seo: {} }
    expect(seoRow(bare).title).toBe('Rural Hackers')
  })

  it('leaves description and canonical empty rather than inventing them', () => {
    const bare: ArchivedItem = { ...item, seo: {} }
    expect(seoRow(bare).description).toBe('')
    expect(seoRow(bare).canonical).toBe('')
  })

  it('decodes html entities, since this row is compared against rendered output', () => {
    const entitied: ArchivedItem = {
      ...item,
      seo: {
        title: 'Sharing knowledge &amp; Events',
        description: 'A village&#8217;s story &#8211; in Galicia',
      },
    }
    const row = seoRow(entitied)
    expect(row.title).toBe('Sharing knowledge & Events')
    expect(row.description).toBe('A village’s story – in Galicia')
  })

  it('decodes entities in the fallback title too', () => {
    const entitied: ArchivedItem = { ...item, title: 'Rural Hackers &amp; Friends', seo: {} }
    expect(seoRow(entitied).title).toBe('Rural Hackers & Friends')
  })
})

describe('archivePath', () => {
  it('records the front page at index, not at its slug', () => {
    // page_on_front is 13, whose slug is `home` but which is served at "/".
    // Deriving the path from the slug would file the homepage under `home`
    // and phase 2 would rebuild the site's most valuable url at /home/.
    expect(item.archivePath).toBe('index')
    expect(item.slug).toBe('home')
  })
})
