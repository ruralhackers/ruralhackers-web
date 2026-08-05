import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []
  })

const pages = walk('dist').map((f) => ({ file: f, html: readFileSync(f, 'utf8') }))

describe('built markup', () => {
  it('found pages to check', () => {
    expect(pages.length).toBeGreaterThan(0)
  })

  it('never nests a paragraph inside a paragraph', () => {
    /*
     * A <p> inside a <p> is closed by the parser at the inner tag, so the outer
     * element ends up empty and anything styled on it silently does nothing. The
     * home page's tagline was `<p class="tagline"><p>…</p></p>`, which is why it
     * rendered in the body face and black while its computed style said OffBit
     * Trial and orange — the class was on an empty element.
     *
     * It comes from writing multi-line content inside an inline-level element in
     * mdx: the contents are read as a markdown block and wrapped.
     */
    const offenders: string[] = []
    for (const { file, html } of pages) {
      for (const m of html.matchAll(/<p\b[^>]*>(?:(?!<\/p>)[\s\S]){0,400}?<p\b/g)) {
        offenders.push(`${file} at ${m.index}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('emits exactly one h1 per page', () => {
    const offenders: string[] = []
    for (const { file, html } of pages) {
      const n = (html.match(/<h1\b/g) ?? []).length
      if (n !== 1) offenders.push(`${file}: ${n}`)
    }
    expect(offenders).toEqual([])
  })

  it('leaves no unrendered mdx expression in the output', () => {
    // A stray {/* … */} or {`…`} in the html means a block was passed through as
    // text rather than parsed.
    const offenders: string[] = []
    for (const { file, html } of pages) {
      const body = html.replace(/<style[\s\S]*?<\/style>/g, '')
      if (/\{\/\*|\{`/.test(body)) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })
})
