import { describe, it, expect } from 'vitest'
import { decodeEntities } from './html-entities.ts'

describe('decodeEntities', () => {
  it('decodes the ampersand wordpress emits in titles', () => {
    expect(decodeEntities('Trail Maintenance &amp; Wayfinding Steward')).toBe(
      'Trail Maintenance & Wayfinding Steward',
    )
  })

  it('decodes the decimal entities this site actually uses', () => {
    expect(decodeEntities('Anceu &#8211; a coliving&#8217;s story &#8216;here&#8217;')).toBe(
      'Anceu – a coliving’s story ‘here’',
    )
  })

  it('decodes hex entities', () => {
    expect(decodeEntities('caf&#xe9;')).toBe('café')
  })

  it('decodes the named entities beyond ampersand', () => {
    expect(decodeEntities('&lt;tag&gt; &quot;q&quot; &hellip;')).toBe('<tag> "q" …')
  })

  it('leaves unknown named entities untouched rather than dropping them', () => {
    expect(decodeEntities('a &notanentity; b')).toBe('a &notanentity; b')
  })

  it('leaves an out-of-range code point untouched', () => {
    expect(decodeEntities('&#1114112;')).toBe('&#1114112;')
  })

  it('decodes only one level, so a literal ampersand survives', () => {
    expect(decodeEntities('a &amp;amp; b')).toBe('a &amp; b')
  })

  it('returns plain text unchanged', () => {
    expect(decodeEntities('nothing to do here')).toBe('nothing to do here')
  })
})
