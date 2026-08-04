/**
 * Decodes the entities WordPress emits in `title.rendered` and in Yoast's
 * metadata. This matters because `archive/seo/url-inventory.csv` is the contract
 * phase 2 is validated against: WordPress writes `Trail Maintenance &amp;
 * Wayfinding Steward` where the browser shows `&`, so an undecoded contract
 * would fail comparisons that are actually correct.
 *
 * Only the named entities that appear in this site's content are listed, plus
 * full numeric support, which covers the rest (&#8211;, &#8217;, &#8216;).
 */
const NAMED: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
}

export function decodeEntities(input: string): string {
  return input.replace(/&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));/g, (whole, dec, hex, name) => {
    if (dec !== undefined) return safeFromCodePoint(Number.parseInt(dec, 10), whole)
    if (hex !== undefined) return safeFromCodePoint(Number.parseInt(hex, 16), whole)
    // `&amp;amp;` must decode one level only, which falls out of a single pass.
    return NAMED[name as string] ?? whole
  })
}

function safeFromCodePoint(code: number, fallback: string): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return fallback
  try {
    return String.fromCodePoint(code)
  } catch {
    return fallback
  }
}
