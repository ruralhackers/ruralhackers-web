import { describe, it, expect } from 'vitest'
import {
  canonicalName,
  canonicalPath,
  harvestUploadUrls,
  stripSizeSuffix,
  uploadPathFromUrl,
} from './media.ts'

describe('canonicalPath / canonicalName', () => {
  it('decodes percent-encoded filenames so encoded and literal forms match', () => {
    const encoded = 'uploads/2022/10/Creative-Habitat-%E2%80%93-a-project.jpeg'
    const literal = 'uploads/2022/10/Creative-Habitat-–-a-project.jpeg'
    expect(canonicalPath(encoded)).toBe(literal)
    expect(canonicalPath(encoded)).toBe(canonicalPath(literal))
  })

  it('reduces a full url to its decoded filename', () => {
    expect(
      canonicalName('https://ruralhackers.com/wp-content/uploads/2022/10/Creative-%E2%80%93-x.jpeg?v=2'),
    ).toBe('Creative-–-x.jpeg')
  })

  it('survives a malformed percent sequence instead of throwing', () => {
    expect(canonicalPath('uploads/2022/10/broken-%E0%A4%A.jpeg')).toBe(
      'uploads/2022/10/broken-%E0%A4%A.jpeg',
    )
  })
})

describe('stripSizeSuffix', () => {
  it('reduces a resized variant to its original', () => {
    expect(stripSizeSuffix('uploads/2026/06/Hacker-Days-1024x683.jpeg')).toBe(
      'uploads/2026/06/Hacker-Days.jpeg',
    )
  })

  it('leaves an original untouched', () => {
    expect(stripSizeSuffix('uploads/2026/06/Hacker-Days.jpeg')).toBe(
      'uploads/2026/06/Hacker-Days.jpeg',
    )
  })

  it('does not treat a wordpress dedup suffix as a size', () => {
    const p = 'uploads/2026/06/WhatsApp-Image-2026-06-06-at-16.25.27-3.jpeg'
    expect(stripSizeSuffix(p)).toBe(p)
  })

  it('collapses every srcset candidate of one image to a single original', () => {
    const variants = [
      'uploads/2026/06/a-300x200.jpeg',
      'uploads/2026/06/a-768x512.jpeg',
      'uploads/2026/06/a-1024x683.jpeg',
      'uploads/2026/06/a-1536x1024.jpeg',
      'uploads/2026/06/a.jpeg',
    ]
    expect(new Set(variants.map(stripSizeSuffix))).toEqual(new Set(['uploads/2026/06/a.jpeg']))
  })
})

describe('uploadPathFromUrl', () => {
  it('returns the uploads-relative path', () => {
    expect(uploadPathFromUrl('https://ruralhackers.com/wp-content/uploads/2026/06/Hacker-Days.jpeg')).toBe(
      'uploads/2026/06/Hacker-Days.jpeg',
    )
  })

  it('ignores query strings', () => {
    expect(uploadPathFromUrl('https://ruralhackers.com/wp-content/uploads/2026/06/a.jpg?ver=2')).toBe(
      'uploads/2026/06/a.jpg',
    )
  })

  it('returns null for urls outside uploads', () => {
    expect(
      uploadPathFromUrl('https://ruralhackers.com/wp-content/themes/twentytwentyfive/style.css'),
    ).toBeNull()
  })

  it('returns null for a foreign host', () => {
    expect(uploadPathFromUrl('https://example.com/wp-content/uploads/2026/06/a.jpg')).toBeNull()
  })
})

describe('harvestUploadUrls', () => {
  it('finds src, every srcset candidate, href and css url()', () => {
    const html = `
      <img src="https://ruralhackers.com/wp-content/uploads/2026/06/a-1024x683.jpeg"
           srcset="https://ruralhackers.com/wp-content/uploads/2026/06/a-300x200.jpeg 300w,
                   https://ruralhackers.com/wp-content/uploads/2026/06/a.jpeg 1920w">
      <a href="https://ruralhackers.com/wp-content/uploads/2023/05/toolkit.pdf">pdf</a>
      <div style="background-image:url('https://ruralhackers.com/wp-content/uploads/2022/01/bg.png')"></div>
      <img src="https://ruralhackers.com/wp-content/themes/x/logo.svg">`
    expect(harvestUploadUrls(html).sort()).toEqual([
      'https://ruralhackers.com/wp-content/uploads/2022/01/bg.png',
      'https://ruralhackers.com/wp-content/uploads/2023/05/toolkit.pdf',
      'https://ruralhackers.com/wp-content/uploads/2026/06/a-1024x683.jpeg',
      'https://ruralhackers.com/wp-content/uploads/2026/06/a-300x200.jpeg',
      'https://ruralhackers.com/wp-content/uploads/2026/06/a.jpeg',
    ])
  })

  it('deduplicates repeated references', () => {
    const html = `<img src="https://ruralhackers.com/wp-content/uploads/a.jpg">
                  <img src="https://ruralhackers.com/wp-content/uploads/a.jpg">`
    expect(harvestUploadUrls(html)).toEqual(['https://ruralhackers.com/wp-content/uploads/a.jpg'])
  })

  it('returns nothing for html with no uploads', () => {
    expect(harvestUploadUrls('<p>plain</p>')).toEqual([])
  })
})

describe('uploadPathFromUrl protocol handling', () => {
  it('accepts an http:// upload url even though BASE_URL is https', () => {
    // The theme emits its @font-face src as http://, and comparing URL.origin
    // rejects it because the origin includes the scheme. The three fonts that
    // are the site's entire typography would be silently absent from the
    // archive, and only discovered after WordPress was switched off.
    expect(
      uploadPathFromUrl('http://ruralhackers.com/wp-content/uploads/fonts/OffBitTrial-101.otf'),
    ).toBe('uploads/fonts/OffBitTrial-101.otf')
  })

  it('accepts the https form of the same path identically', () => {
    expect(
      uploadPathFromUrl('https://ruralhackers.com/wp-content/uploads/fonts/OffBitTrial-101.otf'),
    ).toBe('uploads/fonts/OffBitTrial-101.otf')
  })

  it('still refuses a different host', () => {
    expect(uploadPathFromUrl('https://example.com/wp-content/uploads/2026/06/a.jpeg')).toBeNull()
  })

  it('still refuses a path outside uploads', () => {
    expect(
      uploadPathFromUrl('http://ruralhackers.com/wp-content/themes/twentytwentyfive/style.css'),
    ).toBeNull()
  })
})

describe('harvestUploadUrls on theme markup', () => {
  it('finds the fonts in an inline @font-face block', () => {
    const html = `<style>
      @font-face{font-family:"OffBit Trial";
        src:url('http://ruralhackers.com/wp-content/uploads/fonts/OffBitTrial-101.otf') format('opentype')}
      @font-face{font-family:Inter;
        src:url('http://ruralhackers.com/wp-content/uploads/fonts/Inter-VariableFont_opszwght.ttf')}
    </style>`
    expect(harvestUploadUrls(html)).toEqual([
      'http://ruralhackers.com/wp-content/uploads/fonts/OffBitTrial-101.otf',
      'http://ruralhackers.com/wp-content/uploads/fonts/Inter-VariableFont_opszwght.ttf',
    ])
  })

  it('finds the compiled stylesheet, which lives under uploads too', () => {
    const html = `<link rel="stylesheet" href="https://ruralhackers.com/wp-content/uploads/siteground-optimizer-assets/combined-css-943b3f.css">`
    expect(harvestUploadUrls(html)).toEqual([
      'https://ruralhackers.com/wp-content/uploads/siteground-optimizer-assets/combined-css-943b3f.css',
    ])
  })
})
