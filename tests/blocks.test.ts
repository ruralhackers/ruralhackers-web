import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'

const dir = 'src/components/blocks'
const files = readdirSync(dir).filter((f) => f.endsWith('.astro'))

describe('block components', () => {
  it('provides the primitives the archived markup needs', () => {
    // PillLabel was added after comparing against the archived screenshots: the
    // outlined pill labelling each section is the design's most recognisable
    // recurring element, and a rebuild without it reads as a different site.
    expect(files.sort()).toEqual([
      'Buttons.astro',
      'Column.astro',
      'Columns.astro',
      'Cover.astro',
      'Figure.astro',
      'Gallery.astro',
      // One entry on a Progress year page. The four year pages are 67 of these.
      'Milestone.astro',
      'PillLabel.astro',
      'Prose.astro',
      'Quote.astro',
      'Section.astro',
      'Spacer.astro',
    ])
  })

  it('reintroduces no wp-block class', () => {
    for (const f of files) {
      expect(readFileSync(`${dir}/${f}`, 'utf8')).not.toContain('wp-block')
    }
  })

  it('styles only through tokens, never raw hex', () => {
    for (const f of files) {
      const src = readFileSync(`${dir}/${f}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      // currentColor and transparent are fine; literal colours are not.
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
    }
  })

  it('requires alt text on Figure', () => {
    const src = readFileSync(`${dir}/Figure.astro`, 'utf8')
    expect(src).toContain('alt: string')
    expect(src).not.toContain('alt?: string')
  })

  it('exports every block from the barrel', () => {
    const barrel = readFileSync(`${dir}/index.ts`, 'utf8')
    for (const f of files) {
      expect(barrel).toContain(f.replace('.astro', ''))
    }
  })
})
