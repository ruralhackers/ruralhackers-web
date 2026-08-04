import { describe, it, expect } from 'vitest'
import { sniffMime } from './sniff.ts'

const bytes = (...v: number[]) => new Uint8Array(v)
const withAscii = (lead: number[], offset: number, s: string) => {
  const out = new Uint8Array(Math.max(lead.length, offset + s.length))
  out.set(lead, 0)
  out.set([...s].map((c) => c.charCodeAt(0)), offset)
  return out
}

describe('sniffMime', () => {
  it('detects jpeg', () => {
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe('image/jpeg')
  })

  it('detects png', () => {
    expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png')
  })

  it('detects gif', () => {
    expect(sniffMime(withAscii([], 0, 'GIF89a'))).toBe('image/gif')
  })

  it('detects webp', () => {
    const b = withAscii([], 0, 'RIFF')
    const full = new Uint8Array(16)
    full.set(b, 0)
    full.set([...'WEBP'].map((c) => c.charCodeAt(0)), 8)
    expect(sniffMime(full)).toBe('image/webp')
  })

  it('detects pdf', () => {
    expect(sniffMime(withAscii([], 0, '%PDF-1.4'))).toBe('application/pdf')
  })

  it('detects a real heic container', () => {
    expect(sniffMime(withAscii([0, 0, 0, 0x20], 4, 'ftypheic'))).toBe('image/heic')
  })

  it('detects heif', () => {
    expect(sniffMime(withAscii([0, 0, 0, 0x20], 4, 'ftypmif1'))).toBe('image/heif')
  })

  it('does not call an mp4 container an image', () => {
    expect(sniffMime(withAscii([0, 0, 0, 0x20], 4, 'ftypisom'))).toBe('video/mp4')
  })

  it('detects svg from its markup', () => {
    expect(sniffMime(withAscii([], 0, '<?xml version="1.0"?><svg xmlns="x"></svg>'))).toBe(
      'image/svg+xml',
    )
  })

  it('returns null for bytes it cannot identify', () => {
    expect(sniffMime(bytes(0x01, 0x02, 0x03, 0x04))).toBeNull()
  })

  it('does not crash on an empty buffer', () => {
    expect(sniffMime(new Uint8Array())).toBeNull()
  })

  it('reports a jpeg as jpeg even when wordpress calls it heic', () => {
    // uploads/2026/06/IMG_1933.jpg is reported image/heic by the API and is
    // plain JPEG on disk. The bytes win.
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xdb))).toBe('image/jpeg')
  })
})

describe('sniffMime on fonts', () => {
  const bytesOf = (...parts: (string | number[])[]): Uint8Array => {
    const out: number[] = []
    for (const p of parts) {
      if (typeof p === 'string') out.push(...[...p].map((c) => c.charCodeAt(0)))
      else out.push(...p)
    }
    return new Uint8Array(out)
  }

  it('identifies a CFF-flavoured OpenType font by its OTTO tag', () => {
    // OffBitTrial-101.otf, the site's display face.
    expect(sniffMime(bytesOf('OTTO', [0x00, 0x0d, 0x00, 0x80]))).toBe('font/otf')
  })

  it('identifies a TrueType font by its 0x00010000 version', () => {
    // Inter-VariableFont_opszwght.ttf, the site's body face.
    expect(sniffMime(bytesOf([0x00, 0x01, 0x00, 0x00], [0x00, 0x11, 0x00, 0x80]))).toBe('font/ttf')
  })

  it('identifies the legacy `true` TrueType tag', () => {
    expect(sniffMime(bytesOf('true', [0x00, 0x0a]))).toBe('font/ttf')
  })

  it('identifies woff and woff2 separately', () => {
    expect(sniffMime(bytesOf('wOFF', 'OTTO'))).toBe('font/woff')
    expect(sniffMime(bytesOf('wOF2', 'OTTO'))).toBe('font/woff2')
  })

  it('still returns null for bytes it cannot place', () => {
    expect(sniffMime(bytesOf('not a known format at all'))).toBeNull()
  })

  it('does not mistake a jpeg for a font', () => {
    expect(sniffMime(bytesOf([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
  })
})
