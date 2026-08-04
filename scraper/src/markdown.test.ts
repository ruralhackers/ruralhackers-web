import { describe, it, expect } from 'vitest'
import {
  basenameOf,
  frontmatter,
  htmlToMarkdown,
  normalizeUploadUrl,
  pickImageSrc,
} from './markdown.ts'

const KNOWN = new Set(['Hacker-Days.jpeg', 'WhatsApp-Image-2026-06-06-at-16.25.27-3.jpeg'])

describe('normalizeUploadUrl', () => {
  it('rewrites a resized variant to the original when the original is known', () => {
    expect(
      normalizeUploadUrl(
        'https://ruralhackers.com/wp-content/uploads/2026/06/Hacker-Days-1024x683.jpeg',
        KNOWN,
      ),
    ).toBe('https://ruralhackers.com/wp-content/uploads/2026/06/Hacker-Days.jpeg')
  })

  it('leaves the url untouched when stripping yields an unknown file', () => {
    const u = 'https://ruralhackers.com/wp-content/uploads/2026/06/Mystery-800x600.jpeg'
    expect(normalizeUploadUrl(u, KNOWN)).toBe(u)
  })

  it('does not treat a wordpress dedup suffix as a size', () => {
    const u =
      'https://ruralhackers.com/wp-content/uploads/2026/06/WhatsApp-Image-2026-06-06-at-16.25.27-3.jpeg'
    expect(normalizeUploadUrl(u, KNOWN)).toBe(u)
  })
})

describe('basenameOf', () => {
  it('takes the filename without the query string', () => {
    expect(basenameOf('https://a.test/x/y/z.jpg?v=1')).toBe('z.jpg')
  })
})

describe('htmlToMarkdown', () => {
  it('drops the block theme group and column wrappers and keeps the prose', () => {
    // Twenty Twenty-Five composes every page from wp-block-group and
    // wp-block-columns. The whole site is 13 such primitives, and none of them
    // carry meaning the markdown needs to keep.
    const html =
      '<div class="wp-block-group is-layout-constrained wp-block-group-is-layout-constrained">' +
      '<div class="wp-block-columns is-layout-flex wp-block-columns-is-layout-flex">' +
      '<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow">' +
      '<h3 class="wp-block-heading">Stuff we do</h3>' +
      '<ul class="wp-block-list"><li>Hacker Days</li></ul></div></div></div>'
    expect(htmlToMarkdown(html, KNOWN)).toBe('### Stuff we do\n\n-   Hacker Days')
  })

  it('converts a figure to an image plus italic caption, pointing at the original', () => {
    const html =
      '<figure class="wp-block-image aligncenter size-large">' +
      '<img src="https://ruralhackers.com/wp-content/uploads/2026/06/Hacker-Days-1024x683.jpeg"' +
      ' alt="Group of people gathered outdoors" class="wp-image-3558"' +
      ' srcset="https://ruralhackers.com/wp-content/uploads/2026/06/Hacker-Days.jpeg 1920w">' +
      '<figcaption class="wp-element-caption">Hacker Days begins.</figcaption></figure>'
    expect(htmlToMarkdown(html, KNOWN)).toBe(
      '![Group of people gathered outdoors](https://ruralhackers.com/wp-content/uploads/2026/06/Hacker-Days.jpeg)\n' +
        '*Hacker Days begins.*',
    )
  })

  it('normalizes a bare img outside a figure', () => {
    const html =
      '<p><img src="https://ruralhackers.com/wp-content/uploads/2026/06/Hacker-Days-300x200.jpeg" alt="x"></p>'
    expect(htmlToMarkdown(html, KNOWN)).toBe(
      '![x](https://ruralhackers.com/wp-content/uploads/2026/06/Hacker-Days.jpeg)',
    )
  })

  it('keeps links', () => {
    expect(
      htmlToMarkdown(
        '<p>See <a href="https://ruralhackers.com/hacker-days/">Hacker Days</a>.</p>',
        KNOWN,
      ),
    ).toBe('See [Hacker Days](https://ruralhackers.com/hacker-days/).')
  })
})

describe('frontmatter', () => {
  it('quotes strings and preserves order', () => {
    expect(frontmatter({ title: 'Rural Hackers', id: 13, draft: false })).toBe(
      '---\ntitle: "Rural Hackers"\nid: 13\ndraft: false\n---\n',
    )
  })

  it('escapes embedded double quotes', () => {
    expect(frontmatter({ title: 'The "best" place' })).toBe(
      '---\ntitle: "The \\"best\\" place"\n---\n',
    )
  })

  it('omits null and undefined fields', () => {
    expect(frontmatter({ title: 'x', description: null, extra: undefined })).toBe(
      '---\ntitle: "x"\n---\n',
    )
  })

  it('renders string arrays as inline yaml lists', () => {
    expect(frontmatter({ tags: ['a', 'b'] })).toBe('---\ntags: ["a", "b"]\n---\n')
  })
})

describe('pickImageSrc', () => {
  it('prefers data-src when src is a lazysizes placeholder', () => {
    // SiteGround's lazysizes puts a base64 gif in src and the real file in
    // data-src. Reading src alone captured the placeholder for 151 of the 155
    // content images, leaving phase 2 with no image references at all.
    expect(
      pickImageSrc(
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'https://ruralhackers.com/wp-content/uploads/2025/02/Mapa.jpg',
      ),
    ).toBe('https://ruralhackers.com/wp-content/uploads/2025/02/Mapa.jpg')
  })

  it('keeps a real src untouched, ignoring any data-src', () => {
    expect(
      pickImageSrc('https://ruralhackers.com/wp-content/uploads/a.jpg', 'https://other/b.jpg'),
    ).toBe('https://ruralhackers.com/wp-content/uploads/a.jpg')
  })

  it('falls back to the placeholder when there is no data-src', () => {
    // Better to record what the page actually had than to invent a url.
    expect(pickImageSrc('data:image/gif;base64,AAAA', null)).toBe('data:image/gif;base64,AAAA')
  })

  it('treats a missing src as empty', () => {
    expect(pickImageSrc(null, null)).toBe('')
  })

  it('uses data-src when src is absent entirely', () => {
    expect(pickImageSrc(null, 'https://ruralhackers.com/wp-content/uploads/c.jpg')).toBe(
      'https://ruralhackers.com/wp-content/uploads/c.jpg',
    )
  })
})
