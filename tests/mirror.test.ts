import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { applyAdditions, addProgress2026 } from '../src/lib/additions.ts'
import { improveSeo, REMOVED } from '../src/lib/seo.ts'

/** Every mirrored page, as its path relative to mirror/pages. */
const pages = (dir = 'mirror/pages', rel = ''): string[] =>
  readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? pages(dir, join(rel, e.name)) : e.name.endsWith('.html') ? [join(rel, e.name)] : [],
  )

/** The mirrored pages that are still built: all but the removed ones. */
const built = () => pages().filter((p) => !(p.replace(/\/?index\.html$/, '') in REMOVED))

describe('the build is the live site', () => {
  // `bun run build` must have run first.
  it('mirrors all 22 sitemap urls and the 404 page', () => {
    expect(pages().length).toBe(23)
  })

  it.each(built())('emits %s byte for byte, plus its additions and search metadata', (page) => {
    const mirrored = readFileSync(join('mirror/pages', page), 'utf8')
    const slug = page.replace(/\/?index\.html$/, '')
    expect(readFileSync(join('dist', page), 'utf8')).toBe(
      page === '404.html' ? addProgress2026(mirrored) : improveSeo(slug, addProgress2026(applyAdditions(slug, mirrored))),
    )
  })

  it.each(Object.keys(REMOVED))('no longer builds %s', (page) => {
    expect(existsSync(join('dist', page, 'index.html'))).toBe(false)
  })

  it('adds every new entry to its page', () => {
    for (const [page, title] of [
      ['2024-2', 'Open doors at Anceu Coliving'],
      ['2025-2', 'aTorna: oral tradition at the Casa do Pobo'],
      ['2025-2', 'Beautiful Bees'],
      ['2025-2', 'Hacker Days 2025: Punto de Agua'],
      ['2025-2', 'Tech4Rural youth exchange'],
      ['2026', 'RURALI-ART'],
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
      const lastNew = page === '2024-2' ? 'Open doors at Anceu Coliving' : 'Tech4Rural youth exchange</h2>'
      expect(html.indexOf(lastNew)).toBeLessThan(html.indexOf('We do what we do thanks to support'))
    }
  })

  it.each(built())('serves every file %s needs from this site', (page) => {
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
    for (const page of built()) {
      expect(readFileSync(join('dist', page), 'utf8')).toContain('href="/2026/"><span class="wp-block-navigation-item__label">2026</span>')
    }
  })

  it('counts the funding of what ran that year, at the amount granted', () => {
    const band = (page: string) => {
      const html = readFileSync(join('dist', page, 'index.html'), 'utf8')
      return html.slice(html.indexOf('We do what we do thanks to support'), html.indexOf('</main>'))
    }
    expect(band('2024-2')).toContain('>19.750 euros</p>')
    expect(band('2025-2')).toContain('>19.750 euros</p>')
    expect(band('2025-2')).toContain('>25.341 euros</p>')
    expect(band('2025-2')).toContain('>10.000 euros</p>')
    for (const page of ['2024-2', '2025-2']) expect(band(page)).not.toContain('15.000 euros')
  })

  it('names the 2026 report for what it is, so it does not compete with /2026/', () => {
    const html = readFileSync('dist/2025-2-2/index.html', 'utf8')
    expect(html).toContain('<title>The European Union in the Villages - Rural Hackers</title>')
    expect(html).not.toContain('2026 - Rural Hackers')
  })

  it('reserves the space of every new image before it loads', () => {
    for (const page of ['2024-2', '2025-2', '2026']) {
      const html = readFileSync(join('dist', page, 'index.html'), 'utf8')
      for (const img of html.match(/<img [^>]*data-src="\/wp-content\/uploads\/2026\/11\/[^"]+"[^>]*>/g) ?? []) {
        expect(img).toMatch(/ width="\d+" height="\d+"/)
      }
    }
  })
})

describe('root files', () => {
  it('serves the live robots.txt, pointing at the sitemap index', () => {
    expect(readFileSync('dist/robots.txt', 'utf8')).toBe(readFileSync('mirror/root/robots.txt', 'utf8'))
    expect(readFileSync('dist/robots.txt', 'utf8')).toContain('Sitemap: https://ruralhackers.com/sitemap_index.xml')
  })

  it('serves every sitemap the index lists, as valid xml', () => {
    const index = readFileSync('dist/sitemap_index.xml', 'utf8')
    const listed = [...index.matchAll(/<loc>https:\/\/ruralhackers\.com\/([^<]+)<\/loc>/g)].map((m) => m[1]!)
    expect(listed).toEqual(['post-sitemap.xml', 'page-sitemap.xml'])
    for (const file of ['sitemap_index.xml', ...listed]) {
      expect(readFileSync(join('dist', file), 'utf8').startsWith('<?xml')).toBe(true)
    }
    expect(existsSync('dist/wp-content/plugins/wordpress-seo/css/main-sitemap.xsl')).toBe(true)
  })

  it('lists every indexable built page exactly once across the sitemaps, /2026/ included', () => {
    const locs = ['page', 'post']
      .flatMap((s) => [...readFileSync(`dist/${s}-sitemap.xml`, 'utf8').matchAll(/<url>\s*<loc>https:\/\/ruralhackers\.com(\/[^<]*)<\/loc>/g)].map((m) => m[1]!))
      .sort()
    const indexable = [...built().filter((p) => p !== '404.html' && !p.startsWith('privacy-policy-2/')).map((p) => '/' + p.replace(/index\.html$/, '')), '/2026/'].sort()
    expect(locs).toEqual(indexable)
  })

  it('maps every WordPress page id to a built page, for the Worker', () => {
    const ids = JSON.parse(readFileSync('dist/_wp-ids.json', 'utf8')) as Record<string, string>
    expect(ids['737']).toBe('/2025-2/')
    expect(Object.keys(ids).length).toBe(16)
    for (const to of Object.values(ids)) expect(existsSync(join('dist', to, 'index.html'))).toBe(true)
    expect(readFileSync('dist/.assetsignore', 'utf8')).toContain('_wp-ids.json')
  })

  it('redirects the other old WordPress addresses, in Cloudflare\'s format', () => {
    const lines = readFileSync('dist/_redirects', 'utf8').trim().split('\n')
    expect(lines).toContain('/wp-sitemap.xml /sitemap_index.xml 301')
    for (const line of lines) {
      const [from, to, code] = line.split(' ')
      expect(from!.startsWith('/') && code === '301').toBe(true)
      expect(existsSync(join('dist', to!, to!.endsWith('/') ? 'index.html' : ''))).toBe(true)
    }
  })

})
