/**
 * Content added on top of the mirrored live pages.
 *
 * The mirror (scripts/mirror-live.ts) overwrites mirror/pages/ every time it
 * runs, so new content does not go there. It goes in mirror/additions/<page>/,
 * one fragment per file, applied in file-name order when the page is built.
 * Re-mirroring therefore never loses it.
 *
 * Each fragment's first line says where it goes:
 *   <!-- insert: before-funding -->  before the "We do what we do thanks to
 *                                    support…" band that closes a year page
 *   <!-- insert: end-of-content -->  at the end of the page's post content
 *   <!-- insert: head -->            before </head>, for css the page lacks
 *   <!-- insert-after: <text> -->     right after the first occurrence of <text>,
 *                                    copied exactly from the mirrored html
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ADDITIONS = 'mirror/additions'

/** When this repo last changed a mirrored page; the sitemap's lastmod for them. */
export const UPDATED = '2026-11-14T00:00:00+00:00'

/**
 * Pages whose title changes. The live site titles both its 2026 report and,
 * now, the /2026/ year page "2026 - Rural Hackers"; two pages with one title
 * compete with each other, so the report is named for what it is.
 */
const TITLES: Readonly<Record<string, { from: string; to: string; crumb: [string, string] }>> = {
  '2025-2-2': {
    from: '2026 - Rural Hackers',
    to: 'The European Union in the Villages - Rural Hackers',
    crumb: ['"position":2,"name":"2026"', '"position":2,"name":"The European Union in the Villages"'],
  },
}

const FUNDING = 'We do what we do thanks to support'
const GROUP = '<div class="wp-block-group alignfull'

const insertionPoint = (html: string, where: string, page: string): number => {
  if (where === 'before-funding') {
    const heading = html.indexOf(FUNDING)
    const at = html.lastIndexOf(GROUP, heading)
    if (heading === -1 || at === -1) throw new Error(`${page}: no funding band to insert before`)
    // Some year pages put a 100px spacer group between the last entry and the
    // band. New entries go above it, so the gap stays where it was.
    const prev = html.lastIndexOf(GROUP, at - 1)
    const between = html.slice(prev, at)
    return prev !== -1 && between.includes('wp-block-spacer') && !between.includes('<h2') ? prev : at
  }
  if (where === 'end-of-content') {
    const content = html.indexOf('entry-content')
    const main = html.indexOf('</main>')
    // entry-content closes with the last two </div> before </main>: its own and its wrapper's.
    const close = html.lastIndexOf('</div></div>', main)
    if (content === -1 || close === -1 || close < content) throw new Error(`${page}: no post content`)
    return close
  }
  if (where === 'head') {
    // WordPress only inlines a block's css on pages that use the block, so a page
    // gaining a new kind of block needs that css added too.
    const at = html.indexOf('</head>')
    if (at === -1) throw new Error(`${page}: no </head>`)
    return at
  }
  throw new Error(`${page}: unknown insertion point "${where}"`)
}

/** The page's html with its additions applied. `page` is the path, e.g. "2025-2". */
export function applyAdditions(page: string, html: string): string {
  const retitled = TITLES[page]
  let out = retitled
    ? html.replaceAll(retitled.from, retitled.to).replace(retitled.crumb[0], retitled.crumb[1])
    : html
  const dir = join(ADDITIONS, page)
  if (!existsSync(dir)) return out
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
    const fragment = readFileSync(join(dir, file), 'utf8')
    const header = /^<!-- (insert: ([a-z-]+)|insert-after: (.+)) -->\n/.exec(fragment)
    if (!header) throw new Error(`${dir}/${file}: first line must be <!-- insert: … --> or <!-- insert-after: … -->`)
    const body = fragment.slice(header[0].length)
    let at: number
    if (header[3]) {
      const found = out.indexOf(header[3])
      if (found === -1) throw new Error(`${dir}/${file}: "${header[3]}" is not in the page`)
      at = found + header[3].length
    } else {
      at = insertionPoint(out, header[2]!, page)
    }
    out = out.slice(0, at) + body + '\n\n\n\n' + out.slice(at)
  }
  return out
}

/**
 * Adds 2026 to the Progress menu, after 2025. The live menu stops at 2025; the
 * 2026 year page is built by src/lib/year-2026.ts.
 */
export function addProgress2026(html: string): string {
  const at = html.indexOf('</ul>', html.indexOf('href="/2025-2/"'))
  if (html.indexOf('href="/2025-2/"') === -1 || at === -1) return html
  return (
    html.slice(0, at) +
    '<li class="wp-block-navigation-item wp-block-navigation-link"><a class="wp-block-navigation-item__content"  href="/2026/"><span class="wp-block-navigation-item__label">2026</span></a></li>' +
    html.slice(at)
  )
}
