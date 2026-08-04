import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/content.config.ts', 'utf8')

describe('content.config.ts', () => {
  it('exports the four collections the archive maps onto', () => {
    const exported = /export const collections = \{([^}]*)\}/.exec(src)?.[1] ?? ''
    const names = exported.split(',').map((s) => s.trim()).filter(Boolean).sort()
    expect(names).toEqual(['pages', 'posts', 'programmes', 'years'])
  })

  it('defines each collection with a loader and a schema', () => {
    for (const name of ['pages', 'programmes', 'years', 'posts']) {
      expect(src).toContain(`const ${name} = defineCollection(`)
    }
    expect(src.match(/loader: localeGlob\(/g)).toHaveLength(4)
  })

  it('imports z from astro/zod rather than adding a zod dependency', () => {
    expect(src).toContain("from 'astro/zod'")
    expect(src).not.toMatch(/from ['"]zod['"]/)
  })

  it('loads mdx from locale-partitioned directories', () => {
    expect(src).toContain("pattern: '**/*.mdx'")
    expect(src).toContain('src/content/${dir}')
  })

  it('does not require a body, because the blog index has none', () => {
    // page_for_posts is rendered from a template; the page owns a url and a
    // title only. A required body would fail the build on a true fact.
    expect(src).toContain('bodyOptional')
  })
})
