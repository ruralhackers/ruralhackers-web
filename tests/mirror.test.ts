import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { applyAdditions, addProgress2026 } from '../src/lib/additions.ts'

/** Every mirrored page, as its path relative to mirror/pages. */
const pages = (dir = 'mirror/pages', rel = ''): string[] =>
  readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? pages(dir, join(rel, e.name)) : e.name.endsWith('.html') ? [join(rel, e.name)] : [],
  )

describe('the build is the live site', () => {
  // `bun run build` must have run first.
  it('mirrors all 22 sitemap urls and the 404 page', () => {
    expect(pages().length).toBe(23)
  })

  it.each(pages())('emits %s byte for byte, plus its additions', (page) => {
    const mirrored = readFileSync(join('mirror/pages', page), 'utf8')
    const slug = page.replace(/\/?index\.html$/, '')
    expect(readFileSync(join('dist', page), 'utf8')).toBe(addProgress2026(page === '404.html' ? mirrored : applyAdditions(slug, mirrored)))
  })

  it('adds every new entry to its page', () => {
    for (const [page, title] of [
      ['2024-2', 'Open doors at Anceu Coliving'],
      ['2025-2', 'aTorna: oral tradition at the Casa do Pobo'],
      ['2025-2', 'Beautiful Bees'],
      ['2026', 'A year of Fuchiqueiras'],
      ['2026', 'Rural Hacker Fest in Ventín'],
    ]) {
      const html = readFileSync(join('dist', page!, 'index.html'), 'utf8')
      expect(html).toContain(`<h2 class="wp-block-heading">${title}</h2>`)
    }
  })

  it('puts the new entries before the funding band, not after it', () => {
    for (const page of ['2024-2', '2025-2']) {
      const html = readFileSync(join('dist', page, 'index.html'), 'utf8')
      const lastNew = page === '2024-2' ? 'Open doors at Anceu Coliving' : 'Beautiful Bees</h2>'
      expect(html.indexOf(lastNew)).toBeLessThan(html.indexOf('We do what we do thanks to support'))
    }
  })

  it.each(pages())('serves every file %s needs from this site', (page) => {
    const html = readFileSync(join('dist', page), 'utf8')
    const refs = [...html.matchAll(/(?:src|href|srcset|data-src|data-srcset)="([^"]+)"/g)]
      .flatMap((m) => m[1]!.split(',').map((s) => s.trim().split(/\s+/)[0]!))
      .filter((u) => /^\/wp-(content|includes)\//.test(u))
    const absent = refs.filter((u) => !existsSync(join('dist', decodeURIComponent(u.split(/[?#]/)[0]!))))
    expect(absent).toEqual([])
  })

  it('no longer loads anything from the WordPress host', () => {
    for (const page of pages()) {
      const html = readFileSync(join('mirror/pages', page), 'utf8')
      expect(html).not.toMatch(/(?:src|srcset|data-src)="https?:\/\/ruralhackers\.com/)
    }
  })

  it('builds /2026/ in the year-page design, on the 2025 shell', () => {
    const html = readFileSync('dist/2026/index.html', 'utf8')
    expect(html).toContain('<title>2026 - Rural Hackers</title>')
    expect(html).toContain('<link rel="canonical" href="https://ruralhackers.com/2026/" />')
    expect(html).not.toContain('2025 - Rural Hackers')
    expect(html).not.toContain('We began to organize Fuchiqueira')
    expect(html).not.toContain('We do what we do thanks to support')
    expect(html).toContain('href="/2026/" aria-current="page"')
    expect(html).not.toContain('href="/2025-2/" aria-current="page"')
    expect(html).toContain('wp-container-core-columns-is-layout-b7f6f8cb{')
  })

  it('links 2026 from the Progress menu on every page', () => {
    for (const page of pages()) {
      expect(readFileSync(join('dist', page), 'utf8')).toContain('href="/2026/"><span class="wp-block-navigation-item__label">2026</span>')
    }
  })

  it('leaves the 2026 report at /2025-2-2/ as the live site has it', () => {
    expect(readFileSync('dist/2025-2-2/index.html', 'utf8')).toBe(addProgress2026(readFileSync('mirror/pages/2025-2-2/index.html', 'utf8')))
  })
})
