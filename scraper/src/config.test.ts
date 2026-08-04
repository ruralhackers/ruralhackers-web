import { describe, it, expect } from 'vitest'
import {
  BASE_URL,
  EXPECTED,
  POST_TYPES,
  REQUIRED_ASSETS,
  TEMPLATE_RENDERED_PAGES,
} from './config.ts'

describe('config', () => {
  it('points at ruralhackers over https with no trailing slash', () => {
    expect(BASE_URL).toBe('https://ruralhackers.com')
  })

  it('expects 218 media, not the 220 the api header claims', () => {
    // X-WP-Total says 220; pagination returns 98 + 100 + 20 = 218. Changing
    // this to 220 makes every verification run fail forever.
    expect(EXPECTED.media).toBe(218)
  })

  it('enumerates every count the verify stage checks', () => {
    expect(EXPECTED).toEqual({
      pages: 15,
      posts: 3,
      categories: 2,
      tags: 0,
      users: 5,
      media: 218,
    })
  })

  it('archives only pages and posts, since this site has no custom post types', () => {
    expect(Object.keys(POST_TYPES)).toEqual(['pages', 'posts'])
  })

  it('requires the three theme fonts, which no other source would catch', () => {
    expect(REQUIRED_ASSETS).toEqual([
      'uploads/fonts/Inter-VariableFont_opszwght.ttf',
      'uploads/fonts/OffBitTrial-101.otf',
      'uploads/fonts/OffBitTrial-101Bold.otf',
    ])
  })
})

describe('TEMPLATE_RENDERED_PAGES', () => {
  it('exempts the posts index, which wordpress renders from a template', () => {
    expect(TEMPLATE_RENDERED_PAGES).toEqual(['blog'])
  })
})
