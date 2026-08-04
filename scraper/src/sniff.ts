/**
 * Identifies a file from its leading bytes.
 *
 * WordPress's `mime_type` is not trustworthy: two files it reports as
 * `image/heic` are plain JPEG on disk, so a report that believed it would tell
 * you to convert files that need nothing. Harvested files have no API record at
 * all. The bytes are the only authority, and we already have them.
 */
export function sniffMime(bytes: Uint8Array): string | null {
  const b = bytes
  const at = (i: number) => b[i] ?? -1
  const ascii = (offset: number, s: string) =>
    [...s].every((c, i) => at(offset + i) === c.charCodeAt(0))

  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg'
  if (at(0) === 0x89 && ascii(1, 'PNG')) return 'image/png'
  if (ascii(0, 'GIF8')) return 'image/gif'
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'image/webp'
  if (ascii(0, '%PDF')) return 'application/pdf'

  // Fonts. The archive holds the theme's .otf and .ttf faces, which are
  // referenced only from a rendered page's inline <style> and appear in no
  // media library listing.
  if (ascii(0, 'OTTO')) return 'font/otf'
  if (ascii(0, 'wOFF')) return 'font/woff'
  if (ascii(0, 'wOF2')) return 'font/woff2'
  if (ascii(0, 'true') || ascii(0, 'ttcf')) return 'font/ttf'
  if (at(0) === 0x00 && at(1) === 0x01 && at(2) === 0x00 && at(3) === 0x00) return 'font/ttf'

  // ISO-BMFF: `....ftyp<brand>`. HEIC and HEIF share the container with MP4.
  if (ascii(4, 'ftyp')) {
    const brand = String.fromCharCode(at(8), at(9), at(10), at(11))
    if (['heic', 'heix', 'hevc', 'heim', 'heis'].includes(brand)) return 'image/heic'
    if (['mif1', 'msf1'].includes(brand)) return 'image/heif'
    if (brand.startsWith('avi')) return 'image/avif'
    return 'video/mp4'
  }

  // SVG and other XML: look for the marker in the first chunk of text.
  const head = new TextDecoder('utf8', { fatal: false }).decode(b.subarray(0, 512))
  if (/<svg[\s>]/i.test(head)) return 'image/svg+xml'

  return null
}
