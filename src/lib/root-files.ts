/**
 * Files served at the site root: robots.txt, Yoast's sitemaps, and the two
 * files Cloudflare reads at deploy: _redirects and _wp-ids.json (the latter is
 * bundled into the Worker, never served; see .assetsignore).
 *
 * robots.txt and the sitemaps are the live site's, mirrored verbatim into
 * mirror/root/ by scripts/mirror-live.ts, so every url search engines already
 * know keeps answering. The only changes: /2026/ joins the page sitemap, and the
 * pages this repo changed get a newer lastmod.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHANGED_PAGES, UPDATED } from './additions.ts'
import { YEAR_2026 } from './year-2026.ts'

const DIR = 'mirror/root'
const ORIGIN = 'https://ruralhackers.com'

/** Yoast prints a comment before the xml declaration, which makes the file invalid xml. */
const stripLeadingComment = (xml: string) => xml.replace(/^<!--[\s\S]*?-->\s*/, '')

const bumpLastmod = (xml: string, loc: string) =>
  xml.replace(
    new RegExp(`(<loc>${loc.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}</loc>\\s*<lastmod>)[^<]*(</lastmod>)`),
    `$1${UPDATED}$2`,
  )

const pageSitemap = (xml: string) => {
  let out = stripLeadingComment(xml)
  for (const page of CHANGED_PAGES) out = bumpLastmod(out, `${ORIGIN}/${page}/`)
  const images = YEAR_2026.images
    .map((src) => `\t\t<image:image>\n\t\t\t<image:loc>${ORIGIN}/wp-content/uploads/${src}</image:loc>\n\t\t</image:image>\n`)
    .join('')
  const entry = `\t<url>\n\t\t<loc>${ORIGIN}/2026/</loc>\n\t\t<lastmod>${UPDATED}</lastmod>\n${images}\t</url>\n`
  return out.replace('</urlset>', `${entry}</urlset>`)
}

const sitemapIndex = (xml: string) => bumpLastmod(stripLeadingComment(xml), `${ORIGIN}/page-sitemap.xml`)

/**
 * WordPress's numeric page links, `/?p=ID` and `/?page_id=ID`, by id. Each id
 * comes from the page's own shortlink. Cloudflare's _redirects cannot match a
 * query string, so src/worker.ts redirects these.
 */
export const wpIds = (): Record<string, string> => {
  const ids: Record<string, string> = {}
  for (const file of listPages()) {
    const html = readFileSync(join('mirror/pages', file), 'utf8')
    const id = /<link rel='shortlink' href='https:\/\/ruralhackers\.com\/\?p=(\d+)'/.exec(html)?.[1]
    if (id) ids[id] = '/' + file.replace(/index\.html$/, '')
  }
  return ids
}

/** Other old WordPress addresses that still reach the site from links and bookmarks. */
const redirects = () =>
  [
    '/wp-sitemap.xml /sitemap_index.xml 301',
    '/sitemap.xml /sitemap_index.xml 301',
    '/index.php / 301',
    '/feed/* / 301',
    '/comments/feed/* / 301',
  ].join('\n') + '\n'

const listPages = (dir = 'mirror/pages', rel = ''): string[] =>
  readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listPages(dir, join(rel, e.name)) : e.name === 'index.html' ? [join(rel, e.name)] : [],
  )

export function rootFiles(): Record<string, { body: string; type: string }> {
  const files: Record<string, { body: string; type: string }> = {}
  for (const name of readdirSync(DIR)) {
    const raw = readFileSync(join(DIR, name), 'utf8')
    if (name === 'robots.txt') files[name] = { body: raw, type: 'text/plain; charset=utf-8' }
    else if (name === 'page-sitemap.xml') files[name] = { body: pageSitemap(raw), type: 'application/xml; charset=utf-8' }
    else if (name === 'sitemap_index.xml') files[name] = { body: sitemapIndex(raw), type: 'application/xml; charset=utf-8' }
    else files[name] = { body: stripLeadingComment(raw), type: 'application/xml; charset=utf-8' }
  }
  files['_redirects'] = { body: redirects(), type: 'text/plain; charset=utf-8' }
  files['_wp-ids.json'] = { body: JSON.stringify(wpIds(), null, 2) + '\n', type: 'application/json' }
  return files
}
