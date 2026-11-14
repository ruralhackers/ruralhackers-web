/**
 * Mirrors ruralhackers.com as it is served today, so the static site is the
 * original pixel for pixel.
 *
 * For every url in the live sitemaps (plus the 404 page) it saves the served html
 * to mirror/pages/<path>/index.html and downloads every wp-content / wp-includes
 * file the page needs (stylesheets, fonts, images, scripts) to public/ at the
 * same path, so the html keeps working unchanged once the host is rewritten to
 * a relative path.
 *
 * Only removals are made to the html, never additions:
 *   - Google tag / Site Kit scripts (analytics, would report local visits)
 *   - links to WordPress endpoints a static host does not have (feeds, oEmbed,
 *     wp-json, xmlrpc)
 *
 * It also keeps robots.txt and Yoast's sitemaps, verbatim, in mirror/root/
 * (search engines already know those urls), and the sitemaps' stylesheet.
 *
 * Run: node scripts/mirror-live.ts              (pages, assets and root files)
 *      node scripts/mirror-live.ts --root-only  (only robots.txt and sitemaps)
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ORIGIN = 'https://ruralhackers.com'
const SITEMAPS = ['post', 'page', 'category', 'author'].map((s) => `${ORIGIN}/${s}-sitemap.xml`)
const ROOT = new URL('..', import.meta.url).pathname
const PAGES_DIR = join(ROOT, 'mirror/pages')
const PUBLIC_DIR = join(ROOT, 'public')
const ROOT_FILES_DIR = join(ROOT, 'mirror/root')

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

const get = async (url: string) => {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' })
    if (res.ok || res.status === 404 || attempt === 3) return res
    await new Promise((r) => setTimeout(r, 1000 * attempt))
  }
}

/** Any reference to a file of this site, absolute (either scheme) or root-relative. */
const ASSET_RE =
  /(?:https?:)?(?:\\?\/\\?\/ruralhackers\.com)?((?:\\?\/)wp-(?:content|includes)(?:\\?\/)[^"'()\s,<>?#\\]*(?:\\\/[^"'()\s,<>?#\\]*)*)/g

const assetPaths = (text: string) => {
  const out = new Set<string>()
  for (const m of text.matchAll(ASSET_RE)) {
    const p = m[1]!.replaceAll('\\/', '/')
    if (/\.[a-z0-9]{2,5}$/i.test(p)) out.add(p)
  }
  return out
}

const downloaded = new Set<string>()
const missing: string[] = []

const download = async (path: string, from: string): Promise<void> => {
  if (downloaded.has(path)) return
  downloaded.add(path)
  const dest = join(PUBLIC_DIR, decodeURIComponent(path))
  const res = await get(ORIGIN + path)
  if (!res.ok) {
    missing.push(`${res.status} ${path} (referenced from ${from})`)
    return
  }
  const buf = Buffer.from(await res.arrayBuffer())
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, buf)
  // Stylesheets reference fonts and images; follow them, resolving relative urls.
  if (path.endsWith('.css')) {
    const css = buf.toString('utf8')
    const deps = new Set(assetPaths(css))
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      const ref = m[1]!
      if (ref.startsWith('data:') || /^https?:/.test(ref) || ref.startsWith('/')) continue
      deps.add(new URL(ref.split(/[?#]/)[0]!, ORIGIN + path).pathname)
    }
    for (const d of deps) await download(d, path)
  }
}

const clean = (html: string) =>
  html
    // analytics
    .replace(/<script[^>]*id="google_gtagjs-js[^"]*"[^>]*>[\s\S]*?<\/script>\s*/g, '')
    .replace(/<script[^>]*googlesitekit[^>]*>[\s\S]*?<\/script>\s*/g, '')
    .replace(/<!-- (?:Google tag \(gtag\.js\) snippet|End Google tag)[^>]*-->\s*/g, '')
    .replace(/<link rel='dns-prefetch' href='\/\/www\.googletagmanager\.com' \/>\s*/g, '')
    .replace(/<meta name="google-site-verification"[^>]*>\s*/g, (m) => m) // kept: invisible, harmless
    // WordPress endpoints a static host does not serve
    .replace(/<link rel="alternate" type="application\/rss\+xml"[^>]*>\s*/g, '')
    .replace(/<link rel="alternate" title="oEmbed[^>]*>\s*/g, '')
    .replace(/<link rel="https:\/\/api\.w\.org\/"[^>]*>\s*/g, '')
    .replace(/<link rel="alternate" title="JSON"[^>]*>\s*/g, '')
    .replace(/<link rel="EditURI"[^>]*>\s*/g, '')

/**
 * Host -> root-relative, except where the absolute url is the point: canonical,
 * shortlink, meta tags and the Yoast JSON-LD stay as the live site has them.
 */
const relativise = (html: string) => {
  const keep: string[] = []
  const stash = (m: string) => `\u0000${keep.push(m) - 1}\u0000`
  const body = html
    .replace(/<script type="application\/ld\+json"[\s\S]*?<\/script>/g, stash)
    .replace(/<meta [^>]*>/g, stash)
    .replace(/<link rel=["'](?:canonical|shortlink)["'][^>]*>/g, stash)
    .replace(/https?:\/\/ruralhackers\.com\//g, '/')
    .replace(/https?:\\\/\\\/ruralhackers\.com\\\//g, '\\/')
  return body.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[Number(i)]!)
}

const sitemapUrls = async () => {
  const urls: string[] = []
  for (const s of SITEMAPS) {
    const xml = await (await get(s)).text()
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1]!
      if (!u.includes('/wp-content/')) urls.push(u)
    }
  }
  return urls
}

const save = async (url: string, outPath: string) => {
  const res = await get(url)
  const html = await res.text()
  if (!res.ok && res.status !== 404) throw new Error(`${res.status} ${url}`)
  for (const p of assetPaths(html)) await download(p, url)
  const out = relativise(clean(html))
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, out, 'utf8')
  return out
}

/** robots.txt, the sitemap index, every sitemap it lists, and their stylesheet. */
const saveRootFiles = async () => {
  mkdirSync(ROOT_FILES_DIR, { recursive: true })
  const save = async (name: string) => {
    const res = await get(`${ORIGIN}/${name}`)
    if (!res.ok) throw new Error(`${res.status} /${name}`)
    const text = await res.text()
    writeFileSync(join(ROOT_FILES_DIR, name), text, 'utf8')
    console.log('root', name)
    return text
  }
  await save('robots.txt')
  const index = await save('sitemap_index.xml')
  for (const m of index.matchAll(/<loc>https:\/\/ruralhackers\.com\/([^<]+\.xml)<\/loc>/g)) await save(m[1]!)
  // The sitemaps style themselves with this; it is served where they point.
  const xsl = await get(`${ORIGIN}/wp-content/plugins/wordpress-seo/css/main-sitemap.xsl`)
  if (!xsl.ok) throw new Error(`${xsl.status} main-sitemap.xsl`)
  const xslPath = join(PUBLIC_DIR, 'wp-content/plugins/wordpress-seo/css/main-sitemap.xsl')
  mkdirSync(dirname(xslPath), { recursive: true })
  writeFileSync(xslPath, Buffer.from(await xsl.arrayBuffer()))
}

await saveRootFiles()
if (process.argv.includes('--root-only')) process.exit(0)

const urls = await sitemapUrls()
const seen = new Set(urls)
const queue = [...urls]
while (queue.length) {
  const url = queue.shift()!
  const path = new URL(url).pathname
  const html = await save(url, join(PAGES_DIR, path, 'index.html'))
  console.log('page', path)
  // Internal pages linked but absent from the sitemaps (pagination, archives).
  for (const m of html.matchAll(/href="(\/[^"#?]*\/)"/g)) {
    const p = m[1]!
    if (/^\/(?:wp-|feed|comments\/feed)/.test(p) || p.includes('/feed/')) continue
    const full = ORIGIN + p
    if (!seen.has(full)) {
      seen.add(full)
      queue.push(full)
    }
  }
}

await save(`${ORIGIN}/this-page-does-not-exist-404/`, join(PAGES_DIR, '404.html'))
console.log('page 404')

console.log(`${downloaded.size} assets, ${missing.length} missing`)
for (const m of missing) console.log('  missing', m)
if (!existsSync(join(PAGES_DIR, 'index.html'))) throw new Error('no home page')
