import { describe, it, expect } from 'vitest'
import {
  checkCounts,
  checkMarkdownBodies,
  checkReferencedImages,
  checkRequiredAssets,
} from './verify.ts'
import type { MediaRecord } from './media.ts'

const rec = (
  localPath: string,
  status: MediaRecord['status'] = 'downloaded',
): MediaRecord => ({
  id: 1,
  url: `https://ruralhackers.com/wp-content/${localPath}`,
  localPath,
  mime: 'image/jpeg',
  alt: '',
  caption: '',
  width: null,
  height: null,
  filesize: null,
  bytes: 1234,
  actualMime: 'image/jpeg',
  source: 'library',
  status,
})

describe('checkReferencedImages', () => {
  it('passes when every referenced image is in the manifest', () => {
    const md = [
      { file: 'posts/a.md', body: '![x](https://ruralhackers.com/wp-content/uploads/2026/06/a.jpeg)' },
    ]
    expect(checkReferencedImages(md, [rec('uploads/2026/06/a.jpeg')])).toEqual([])
  })

  it('reports an image that was never downloaded as an error', () => {
    const md = [
      { file: 'posts/a.md', body: '![x](https://ruralhackers.com/wp-content/uploads/2026/06/ghost.jpeg)' },
    ]
    const problems = checkReferencedImages(md, [rec('uploads/2026/06/a.jpeg')])
    expect(problems).toHaveLength(1)
    expect(problems[0]!.rule).toBe('referenced-image-missing')
    expect(problems[0]!.severity).toBe('error')
    expect(problems[0]!.detail).toContain('ghost.jpeg')
    expect(problems[0]!.detail).toContain('posts/a.md')
  })

  it('reports a source-side breakage as a warning, not an error', () => {
    // ruralhackers.com references uploads/2023/04/anceu-logo.png from two pages and
    // then 404s it. The archive records that; it must not fail the run.
    const md = [
      { file: 'pages/what-is-rural-coliving.md', body: '![](https://ruralhackers.com/wp-content/uploads/2023/04/anceu-logo.png)' },
    ]
    const problems = checkReferencedImages(md, [
      rec('uploads/2023/04/anceu-logo.png', 'missing-at-source'),
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0]!.rule).toBe('broken-at-source')
    expect(problems[0]!.severity).toBe('warning')
  })

  it('ignores external images', () => {
    const md = [{ file: 'posts/a.md', body: '![x](https://images.example.com/a.jpg)' }]
    expect(checkReferencedImages(md, [])).toEqual([])
  })

  it('matches a literal en dash in content against the encoded path on disk', () => {
    // The manifest stores %E2%80%93 because that is what the URL path contains;
    // the markdown carries the literal character. These are the same file.
    const md = [
      {
        file: 'posts/creative-habitat.md',
        body: '![x](https://ruralhackers.com/wp-content/uploads/2022/10/Creative-Habitat-–-a-project.jpeg)',
      },
    ]
    const manifest = [rec('uploads/2022/10/Creative-Habitat-%E2%80%93-a-project.jpeg')]
    expect(checkReferencedImages(md, manifest)).toEqual([])
  })
})

describe('checkCounts', () => {
  it('passes when everything matches the expected figures', () => {
    expect(
      checkCounts({
        pages: 15,
        posts: 3,
        categories: 2,
        tags: 0,
        users: 5,
        media: 218,
      }),
    ).toEqual([])
  })

  it('reports each mismatch with expected and actual', () => {
    const problems = checkCounts({
      pages: 14,
      posts: 3,
      categories: 2,
      tags: 0,
      users: 5,
      media: 218,
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]!.rule).toBe('count-mismatch')
    expect(problems[0]!.severity).toBe('error')
    expect(problems[0]!.detail).toBe('pages: expected 15, got 14')
  })

  it('fails the 220 that X-WP-Total reports for media', () => {
    // The header overreports by 2. This test is the guardrail against someone
    // "correcting" EXPECTED.media to match the header.
    const problems = checkCounts({
      pages: 15,
      posts: 3,
      categories: 2,
      tags: 0,
      users: 5,
      media: 220,
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]!.detail).toBe('media: expected 218, got 220')
  })
})

describe('checkRequiredAssets', () => {
  const asset = (localPath: string, status: MediaRecord['status']): MediaRecord => ({
    id: null,
    url: `http://ruralhackers.com/wp-content/${localPath}`,
    localPath,
    mime: '',
    alt: '',
    caption: '',
    width: null,
    height: null,
    filesize: null,
    bytes: 1024,
    actualMime: 'font/otf',
    source: 'harvested',
    status,
  })

  const allThree = [
    'uploads/fonts/Inter-VariableFont_opszwght.ttf',
    'uploads/fonts/OffBitTrial-101.otf',
    'uploads/fonts/OffBitTrial-101Bold.otf',
  ]

  it('passes when every required asset was downloaded', () => {
    expect(checkRequiredAssets(allThree.map((p) => asset(p, 'downloaded')))).toEqual([])
  })

  it('errors on a required asset absent from the manifest entirely', () => {
    const manifest = allThree.slice(0, 2).map((p) => asset(p, 'downloaded'))
    const problems = checkRequiredAssets(manifest)
    expect(problems).toHaveLength(1)
    expect(problems[0]!.rule).toBe('required-asset-missing')
    expect(problems[0]!.severity).toBe('error')
    expect(problems[0]!.detail).toContain('OffBitTrial-101Bold.otf')
  })

  it('errors on a required asset that is in the manifest but never downloaded', () => {
    const manifest = [
      asset(allThree[0]!, 'downloaded'),
      asset(allThree[1]!, 'downloaded'),
      asset(allThree[2]!, 'missing-at-source'),
    ]
    const problems = checkRequiredAssets(manifest)
    expect(problems).toHaveLength(1)
    expect(problems[0]!.rule).toBe('required-asset-missing')
    expect(problems[0]!.severity).toBe('error')
  })

  it('compares decoded paths, so an encoded manifest path still matches', () => {
    const manifest = allThree.map((p) => asset(p.replace(/_/g, '%5F'), 'downloaded'))
    // Only the Inter filename contains an underscore; the other two match plainly.
    expect(checkRequiredAssets(manifest)).toEqual([])
  })
})

describe('checkMarkdownBodies', () => {
  it('passes when every file has prose', () => {
    expect(
      checkMarkdownBodies([
        { file: 'content/pages/about.md', body: '---\ntitle: "About"\n---\n\nWe build things.\n' },
      ]),
    ).toEqual([])
  })

  it('errors on a page whose body is only frontmatter', () => {
    const problems = checkMarkdownBodies([
      { file: 'content/pages/hacker-days.md', body: '---\ntitle: "Hacker Days"\n---\n\n' },
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0]!.rule).toBe('empty-markdown')
    expect(problems[0]!.severity).toBe('error')
    expect(problems[0]!.detail).toBe('content/pages/hacker-days.md has no body')
  })

  it('exempts the posts index, which has no body of its own', () => {
    // page_for_posts is 16, slug `blog`. The theme renders the index; the page
    // owns the url and the title only.
    expect(
      checkMarkdownBodies([{ file: 'content/pages/blog.md', body: '---\ntitle: "Blog"\n---\n\n' }]),
    ).toEqual([])
  })

  it('does not exempt a post that merely happens to be named blog elsewhere', () => {
    // The exemption is by slug, so this is a deliberate limitation worth pinning:
    // a genuinely empty posts/blog.md would also be tolerated. There is no such
    // post on this site, and the counts assert that.
    expect(
      checkMarkdownBodies([{ file: 'content/posts/whatever.md', body: '---\nx: 1\n---\n' }]),
    ).toHaveLength(1)
  })
})
