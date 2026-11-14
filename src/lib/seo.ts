/**
 * What search engines and answer engines read, on top of the mirrored pages.
 *
 * The live WordPress site left most of it to Yoast's defaults: no meta
 * descriptions (Yoast filled og:description with the first lines of the page),
 * no h1 on most pages, 96% of images without alt text, an Organization with
 * only a name and a logo, and template content from Twenty Twenty-Five (a
 * flower shop's About page and two posts about flowers) indexed as if it were
 * Rural Hackers. This module fixes that at build time, so a re-mirror keeps it.
 */

const ORIGIN = 'https://ruralhackers.com'
const ORG = `${ORIGIN}/#organization`

/**
 * Pages that are no longer built, and where their url now goes (301). The
 * About page and the two posts are the theme's demo content; the author and
 * category archives only list posts that are already on /blog/.
 */
export const REMOVED: Readonly<Record<string, string>> = {
  about: '/',
  'the-delicate-charm-of-bloodwort-blooms': '/blog/',
  'the-story-of-sunflowers-and-their-little-visitors': '/blog/',
  'author/agustinanceu-com': '/blog/',
  'author/nacho': '/blog/',
  'category/uncategorized': '/blog/',
  'category/uncategorized-en': '/blog/',
}

/** Sitemaps that only listed removed pages. They redirect to the index. */
export const REMOVED_SITEMAPS = ['author-sitemap.xml', 'category-sitemap.xml'] as const

interface Page {
  /** The page's h1. Added for screen readers when the page has none. */
  h1: string
  /** Meta description and og:description; under 160 characters. */
  description: string
  /** Kept online but out of search results. */
  noindex?: boolean
  /** Exact text changes, [from, to]. */
  replace?: [string, string][]
  /** Extra schema.org nodes for the page's graph. */
  schema?: object[]
}

const HACKER_DAYS_VIDEO = {
  '@type': 'VideoObject',
  '@id': `${ORIGIN}/2025-2/#hacker-days-2025-video`,
  name: 'Hacker Days 2025 in 3 minutes: Punto de Agua',
  description:
    'A village in Galicia, a real problem and one week to solve it: how Hacker Days 2025 built Punto de Agua, an open source app for the community water system of Anceu.',
  thumbnailUrl: 'https://i.ytimg.com/vi/0pRLE9QEOus/hqdefault.jpg',
  uploadDate: '2026-02-27T11:44:58-08:00',
  duration: 'PT3M37S',
  embedUrl: 'https://www.youtube-nocookie.com/embed/0pRLE9QEOus',
  url: 'https://www.youtube.com/watch?v=0pRLE9QEOus',
  inLanguage: 'es',
  publisher: { '@id': ORG },
}

const ANCEU = {
  '@type': 'Place',
  name: 'Anceu',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Anceu, Ponte Caldelas',
    addressRegion: 'Pontevedra, Galicia',
    addressCountry: 'ES',
  },
}

const HACKER_DAYS_2025 = {
  '@type': 'Event',
  '@id': `${ORIGIN}/hacker-days/#hacker-days-2025`,
  name: 'Hacker Days 2025: Punto de Agua',
  description:
    'A one-week event in Anceu, Galicia, where technologists, designers and neighbours built Punto de Agua, an open source app for the community management of village water.',
  startDate: '2025-08-31',
  endDate: '2025-09-07',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: ANCEU,
  organizer: { '@id': ORG },
  image: `${ORIGIN}/wp-content/uploads/2026/11/hacker-days-2025.jpg`,
  url: 'https://hackerdays.org/',
}

export const PAGES: Readonly<Record<string, Page>> = {
  '': {
    h1: 'Rural Hackers',
    description:
      'Rural Hackers is a non-profit in Anceu, Galicia, where technology, art and rural life meet: residencies, Hacker Days, Fuchiqueiras and open source tools.',
  },
  blog: {
    h1: 'Blog',
    description: 'News from Rural Hackers, the association bringing technology, art and community to the village of Anceu, in rural Galicia.',
  },
  contact: {
    h1: 'Contact',
    description:
      'Get in touch with Rural Hackers in Anceu, Ponte Caldelas (Galicia) about residencies, Hacker Days, partnerships or a visit: hello@ruralhackers.com.',
  },
  'creative-residencies': {
    h1: 'Creative Residencies',
    description:
      'Artists and technologists in residence in Anceu, Galicia: short films, murals, comics, AI art and species mapping, made together with the village.',
  },
  'hacker-days': {
    h1: 'Hacker Days',
    description:
      'Hacker Days: a week in Anceu, Galicia, where technologists, designers and neighbours build open source prototypes for real rural problems, like village water.',
    replace: [['<strong>Upcoming Hacker Days Event (2025)</strong>', '<strong>Hacker Days 2025</strong>']],
    schema: [HACKER_DAYS_2025],
  },
  'rural-digital-projects': {
    h1: 'Rural Digital Projects',
    description:
      'Open source tools and digital projects built with rural communities in Galicia: Anceu Maker Space, ReFrame Cam, TecnoArranxo and robotics for kids.',
  },
  'sharing-knowledge-events': {
    h1: 'Sharing Knowledge Events',
    description:
      'Fuchiqueira, Entre Culturas and Green Missions: monthly gatherings in Anceu where traditional crafts meet modern tools and every generation teaches the others.',
  },
  'rural-hackers-residencies': {
    h1: 'Rural Hackers Residencies',
    description:
      'Live and create in Anceu, a Galician village: private accommodation, a maker space and a creative community. Self-funded or fully funded residencies.',
  },
  ruralwo: {
    h1: 'RuralWO: a WordPress residency for women',
    description:
      'RuralWO: a one-month residency in rural Galicia for women who want to connect with the WordPress community, learn and contribute.',
  },
  '2023-2': {
    h1: 'Rural Hackers in 2023',
    description:
      'Rural Hackers in 2023: the Human versus Machine residency, the As Indianas and Becoming Cuco films, Anceu Maker Space, Entre Culturas and robotics for kids.',
  },
  '2024-2': {
    h1: 'Rural Hackers in 2024',
    description:
      'Rural Hackers in 2024: the first Fuchiqueira, Culture Moves Europe, ReFrame Cam, Anceu Fest IV, our first WordCamp Europe and Galicia Maker Faire.',
  },
  '2025-2': {
    h1: 'Rural Hackers in 2025',
    description:
      'Rural Hackers in 2025: Hacker Days and Punto de Agua, Tech4Rural, Rural IA, Culture Moves Europe, Fuchiqueira, Beautiful Bees and WordCamp Europe.',
    schema: [HACKER_DAYS_VIDEO],
  },
  '2025-2-2': {
    h1: 'The European Union in the Villages',
    description:
      'Report of “The European Union in the Villages” (4Data Democracy): on 20 June 2026, about 80 neighbours of Gaxate, Vilán and Anceu talked about their future.',
  },
  '2026': {
    h1: 'Rural Hackers in 2026',
    description:
      'Rural Hackers in 2026: AventuraTech, CanTech and FemTech, the European Union in the villages, Fuchiqueiras, the Rural Hacker Fest and RURALI-ART.',
  },
  'speakers-at-festival-creativa': {
    h1: 'Speakers at Festival Creativa',
    description: 'Rural Hackers co-founder Nacho spoke at Creativa Festival 2025 in Vigo about how art and technology are transforming rural life.',
  },
  'privacy-policy-2': {
    h1: 'Privacy Policy',
    description: 'Privacy policy of ruralhackers.com.',
    // WordPress's suggested privacy text, about comments and Gravatar.
    noindex: true,
  },
}

/** Pages that belong in the sitemap. */
export const INDEXED = Object.keys(PAGES).filter((p) => !PAGES[p]!.noindex)

const ORGANIZATION = {
  '@type': ['Organization', 'NGO'],
  '@id': ORG,
  name: 'Rural Hackers',
  alternateName: 'Asociación Rural Hackers',
  url: `${ORIGIN}/`,
  description:
    'Rural Hackers is a non-profit association based in the village of Anceu (Ponte Caldelas, Galicia, Spain) that brings technology, art and rural life together through creative residencies, Hacker Days, monthly knowledge-sharing gatherings and open source projects built with rural communities.',
  email: 'hello@ruralhackers.com',
  location: ANCEU,
  address: ANCEU.address,
  areaServed: 'Galicia, Spain',
  knowsAbout: ['Rural innovation', 'Artist residencies', 'Hackathons', 'Open source software', 'Digital inclusion', 'Community water management'],
  sameAs: ['https://www.instagram.com/ruralhackers/', 'https://www.youtube.com/@ruralhackers', 'https://www.linkedin.com/company/rural-hackers'],
}

const removedHref = (href: string) => {
  const path = href.replace(ORIGIN, '').replace(/^\/|\/$/g, '')
  return path in REMOVED
}

/** Index just after the element that opens at `start`, counting nested tags of the same name. */
const elementEnd = (html: string, start: number): number => {
  const tag = /^<([a-z0-9]+)/.exec(html.slice(start))![1]!
  const re = new RegExp(`<${tag}[\\s>]|</${tag}>`, 'g')
  re.lastIndex = start
  let depth = 0
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0].startsWith('</') ? -1 : 1
    if (depth === 0) return m.index + m[0].length
  }
  throw new Error(`unclosed <${tag}> at ${start}`)
}

const removeElements = (html: string, opening: string, keep: (element: string) => boolean = () => false) => {
  let out = html
  for (let at = out.indexOf(opening); at !== -1; at = out.indexOf(opening, at)) {
    const end = elementEnd(out, at)
    if (keep(out.slice(at, end))) at = end
    else out = out.slice(0, at) + out.slice(end)
  }
  return out
}

/** Takes out every trace of the removed pages: cards, bylines, post navigation, links. */
const dropRemoved = (page: string, html: string) => {
  const links = (s: string) => [...s.matchAll(/href="([^"]+)"/g)].some((m) => removedHref(m[1]!))
  let out = removeElements(html, '<li class="wp-block-post ', (li) => !links(li))
  // "Written by <author> in <category>": the name stays, the archive links go.
  out = out.replace(/<a href="\/author\/[^"]*"[^>]*>([^<]*)<\/a>/g, '$1')
  out = out.replace(/\s*<p class="wp-block-paragraph">in<\/p>\s*<div[^>]*taxonomy-category[^>]*>[\s\S]*?<\/div>/g, '')
  out = out.replace(
    /(<div class="post-navigation-link-(?:previous|next) wp-block-post-navigation-link">)((?:(?!<\/div>)[\s\S])*)<\/div>/g,
    (all, open: string, inner: string) => (links(inner) ? `${open}</div>` : all),
  )
  // "More posts" that would list only the post itself.
  const more = out.indexOf('More posts</h2>')
  if (more !== -1) {
    const start = out.lastIndexOf('<div class="wp-block-group', more)
    const end = elementEnd(out, start)
    const others = [...out.slice(start, end).matchAll(/<h3 class="wp-block-post-title[^>]*><a href="([^"]+)"/g)].filter((m) => m[1] !== `/${page}/`)
    if (others.length === 0) out = out.slice(0, start) + out.slice(end)
  }
  // The comment form posts to WordPress, which is gone.
  out = removeElements(out, '<div class="wp-block-comments')
  return out.replace(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (all, href: string, text: string) => (removedHref(href) ? text : all))
}

const LOGOS: [RegExp, string][] = [
  [/\/RH_[A-Z_-]+\.png|RH_LOGO/, 'Rural Hackers logo'],
  [/\/ey_logo/, 'Eleven Yellow logo'],
  [/comunidad_montes/, 'Comunidade de Montes de Anceu logo'],
  [/casa_do_pobo/, 'Casa do Pobo de Anceu logo'],
]

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&#8217;|&#039;/g, '’')
    .replace(/&#8211;/g, '–')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const attr = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;')

/**
 * Alt text for every image that has none: a logo is named for its owner, any
 * other image after the heading of the entry it illustrates.
 */
const addAlts = (html: string, fallback: string) => {
  const GROUP = '<div class="wp-block-group alignfull'
  const headingFor = (at: number) => {
    const start = html.lastIndexOf(GROUP, at)
    const next = html.indexOf(GROUP, at)
    const section = html.slice(start === -1 ? 0 : start, next === -1 ? html.length : next)
    // A heading used as a slogan is no description of a picture.
    const usable = (t: string) => t && t.length <= 80
    for (const m of section.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)) if (usable(text(m[1]!))) return text(m[1]!)
    const before = [...html.slice(0, at).matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)].map((m) => text(m[1]!)).filter(usable)
    return before.at(-1) ?? fallback
  }
  return html.replace(/<img\b[^>]*>/g, (img, offset: number) => {
    if (/\salt="[^"]+"/.test(img)) return img
    const src = /(?:data-src|src)="(\/[^"]+)"/.exec(img)?.[1] ?? ''
    const alt = LOGOS.find(([re]) => re.test(src))?.[1] ?? headingFor(offset)
    return /\salt=""/.test(img) ? img.replace(/\salt=""/, ` alt="${attr(alt)}"`) : img.replace(/^<img\b/, `<img alt="${attr(alt)}"`)
  })
}

const rewriteSchema = (html: string, page: string, seo: Page) =>
  html.replace(/(<script type="application\/ld\+json" class="yoast-schema-graph">)([\s\S]*?)(<\/script>)/, (_, open: string, json: string, close: string) => {
    const data = JSON.parse(json) as { '@graph': object[] }
    const graph = (data['@graph'] as Record<string, unknown>[]).map((node): object => {
      const types = [node['@type']].flat()
      const type = types.includes('CollectionPage') ? 'WebPage' : types[0]
      if (type === 'Organization') return ORGANIZATION
      if (type === 'WebSite') {
        // The search box would point at /?s=, which a static site does not answer.
        const { potentialAction: _search, ...site } = node
        return { ...site, description: 'A movement for the revitalization of rural life', inLanguage: 'en' }
      }
      if (type === 'WebPage') {
        return { ...node, description: seo.description, about: { '@id': ORG }, ...(seo.schema?.length ? { mentions: seo.schema.map((s) => ({ '@id': (s as { '@id': string })['@id'] })) } : {}) }
      }
      if (type === 'Article') {
        const { articleSection: _section, ...article } = node
        return article
      }
      if (type === 'Person') {
        const { url: _archive, ...person } = node
        return person
      }
      return node
    })
    data['@graph'] = [...graph, ...(seo.schema ?? [])]
    return open + JSON.stringify(data).replaceAll('</', '<\\/') + close
  })

/** The page's html with its search and answer-engine metadata fixed. `page` is the path, e.g. "2025-2". */
export function improveSeo(page: string, html: string): string {
  const seo = PAGES[page]
  if (!seo) throw new Error(`${page}: no entry in PAGES (src/lib/seo.ts)`)
  let out = html.replaceAll('http://ruralhackers.com', ORIGIN).replaceAll('http:\\/\\/ruralhackers.com', 'https:\\/\\/ruralhackers.com')
  for (const [from, to] of seo.replace ?? []) {
    if (!out.includes(from)) throw new Error(`${page}: "${from}" is not in the page`)
    out = out.replace(from, to)
  }

  const description = attr(seo.description)
  out = out.replace(/<meta name="description" content="[^"]*" \/>\s*/, '')
  out = out.includes('<meta property="og:description"')
    ? out.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${description}" />`)
    : out.replace(/(<meta property="og:title" content="[^"]*" \/>)/, `$1\n\t<meta property="og:description" content="${description}" />`)
  out = out.replace(
    /<meta name='robots' content='[^']*' \/>/,
    (robots) => `${seo.noindex ? "<meta name='robots' content='noindex, follow' />" : robots}\n<meta name="description" content="${description}" />`,
  )
  // The reading-time label is Yoast's, and wrong once the page changes.
  out = out.replace(/\s*<meta name="twitter:label1"[^>]*>\s*<meta name="twitter:data1"[^>]*>/, '')

  out = rewriteSchema(out, page, seo)
  out = dropRemoved(page, out)

  const main = /<main\b[^>]*>/.exec(out)
  if (main && !out.slice(main.index, out.indexOf('</main>')).includes('<h1')) {
    const at = main.index + main[0].length
    out = out.slice(0, at) + `<h1 class="screen-reader-text">${attr(seo.h1)}</h1>` + out.slice(at)
  }
  return addAlts(out, seo.h1)
}

/** /llms.txt: what the site is, for language models, in their format (llmstxt.org). */
export function llmsTxt(): string {
  const link = (path: string, title: string) => `- [${title}](${ORIGIN}/${path ? `${path}/` : ''}): ${PAGES[path]!.description}`
  return `# Rural Hackers

> ${ORGANIZATION.description}

Contact: ${ORGANIZATION.email}. Instagram, YouTube and LinkedIn: @ruralhackers. The site is in English; the village life it describes happens in Galician and Spanish.

## Programmes

${link('hacker-days', 'Hacker Days')}
${link('rural-hackers-residencies', 'Rural Hackers Residencies')}
${link('creative-residencies', 'Creative Residencies')}
${link('sharing-knowledge-events', 'Sharing Knowledge Events')}
${link('rural-digital-projects', 'Rural Digital Projects')}
${link('ruralwo', 'RuralWO')}

## What we did, year by year

${link('2023-2', '2023')}
${link('2024-2', '2024')}
${link('2025-2', '2025')}
${link('2026', '2026')}
${link('2025-2-2', 'The European Union in the Villages (report)')}

## Optional

${link('', 'Home')}
${link('blog', 'Blog')}
${link('contact', 'Contact')}
- [Hacker Days site](https://hackerdays.org/): the Hacker Days 2025 challenge and its day-by-day log.
`
}
