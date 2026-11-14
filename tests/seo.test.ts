import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PAGES, REMOVED } from '../src/lib/seo.ts'

// `bun run build` must have run first.
const html = (page: string) => readFileSync(join('dist', page, 'index.html'), 'utf8')
const head = (page: string) => html(page).split('</head>')[0]!
const graph = (page: string) => {
  const json = /<script type="application\/ld\+json" class="yoast-schema-graph">([\s\S]*?)<\/script>/.exec(html(page))![1]!
  return (JSON.parse(json) as { '@graph': Record<string, unknown>[] })['@graph']
}
const ofType = (page: string, type: string) => graph(page).find((n) => [n['@type']].flat().includes(type))

describe('search metadata', () => {
  it('has an entry for every built page', () => {
    const built = readdirSync('dist', { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('index.html'))
      .map((f) => f.replace(/\/?index\.html$/, ''))
    expect(built.sort()).toEqual(Object.keys(PAGES).sort())
  })

  it.each(Object.keys(PAGES))('gives /%s/ one meta description, under 160 characters, also as og:description', (page) => {
    const descriptions = [...head(page).matchAll(/<meta name="description" content="([^"]*)" \/>/g)].map((m) => m[1])
    expect(descriptions.length).toBe(1)
    expect(PAGES[page]!.description.length).toBeLessThanOrEqual(160)
    expect(head(page)).toContain(`<meta property="og:description" content="${descriptions[0]}" />`)
  })

  it.each(Object.keys(PAGES))('gives /%s/ exactly one h1', (page) => {
    const main = html(page).slice(html(page).indexOf('<main'), html(page).indexOf('</main>'))
    expect(main.match(/<h1\b/g)?.length).toBe(1)
  })

  it.each(Object.keys(PAGES))('gives every image on /%s/ alt text', (page) => {
    const missing = (html(page).match(/<img\b[^>]*>/g) ?? []).filter((img) => !/\salt="[^"]+"/.test(img))
    expect(missing).toEqual([])
  })

  it.each(Object.keys(PAGES))('serves /%s/ over https only', (page) => {
    expect(html(page)).not.toMatch(/http:(\\\/\\\/|\/\/)ruralhackers\.com/)
  })

  it('describes the organization, with no search box that a static site cannot answer', () => {
    const org = ofType('', 'NGO')!
    expect(org['email']).toBe('hello@ruralhackers.com')
    expect(org['sameAs']).toContain('https://www.youtube.com/@ruralhackers')
    expect(ofType('', 'WebSite')!['potentialAction']).toBeUndefined()
    expect(ofType('', 'WebPage')!['description']).toBe(PAGES['']!.description)
    expect(ofType('blog', 'CollectionPage')!['description']).toBe(PAGES['blog']!.description)
  })

  it('marks up Hacker Days 2025 as an event and its video', () => {
    expect(ofType('hacker-days', 'Event')).toMatchObject({ startDate: '2025-08-31', name: 'Hacker Days 2025: Punto de Agua' })
    expect(ofType('2025-2', 'VideoObject')).toMatchObject({ embedUrl: 'https://www.youtube-nocookie.com/embed/0pRLE9QEOus' })
    expect(html('2025-2')).toContain('src="https://www.youtube-nocookie.com/embed/0pRLE9QEOus"')
    expect(html('hacker-days')).toContain('<strong>Hacker Days 2025</strong>')
    expect(existsSync('dist/wp-content/uploads/2026/11/hacker-days-2025.jpg')).toBe(true)
  })

  it('keeps the WordPress privacy boilerplate out of search results', () => {
    expect(head('privacy-policy-2')).toContain("<meta name='robots' content='noindex, follow' />")
  })
})

describe('the removed pages', () => {
  it('leave no link, card, byline or comment form behind', () => {
    for (const page of Object.keys(PAGES)) {
      const links = [...html(page).matchAll(/href="(?:https:\/\/ruralhackers\.com)?\/([^"]*?)\/?"/g)].map((m) => m[1])
      expect(links.filter((l) => l! in REMOVED)).toEqual([])
    }
    const post = html('speakers-at-festival-creativa')
    expect(post).toContain('Nacho')
    expect(post).not.toContain('Uncategorized')
    expect(post).not.toContain('wp-comments-post.php')
    expect(post).not.toContain('More posts')
    expect(html('blog')).not.toMatch(/sunflower|bloodwort/i)
  })

  it('redirect to where their content lives', () => {
    const lines = readFileSync('dist/_redirects', 'utf8').split('\n')
    for (const [page, to] of Object.entries(REMOVED)) expect(lines).toContain(`/${page}/ ${to} 301`)
    expect(lines).toContain('/author-sitemap.xml /sitemap_index.xml 301')
  })
})

describe('llms.txt', () => {
  it('describes the site and links its main pages', () => {
    const txt = readFileSync('dist/llms.txt', 'utf8')
    expect(txt.startsWith('# Rural Hackers\n\n> ')).toBe(true)
    expect(txt).toContain('(https://ruralhackers.com/hacker-days/)')
    for (const m of txt.matchAll(/\]\(https:\/\/ruralhackers\.com\/([^)]*)\)/g)) {
      expect(existsSync(join('dist', m[1]!, 'index.html'))).toBe(true)
    }
  })
})
