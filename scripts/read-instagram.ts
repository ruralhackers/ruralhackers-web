/**
 * Reads the date and caption of public Instagram posts.
 *
 * Why this exists: the Progress pages for 2026 had one entry, and nobody
 * remembered the rest. The account holder could not be reached for a data export
 * or a Graph API token, so this reads what a visitor can already see — a public
 * post page exposes its caption in og:description and its timestamp in <time>,
 * before the login prompt covers the page.
 *
 * It does not log in, does not defeat the prompt, and does not touch anything
 * private. Discovery is limited to what the profile grid renders (about twelve
 * posts) plus any permalink the website already links, so this is a supplement to
 * an account export, not a replacement for one.
 *
 * Run: bun scripts/read-instagram.ts             (discover from the profile)
 *      bun scripts/read-instagram.ts urls.txt    (read a list of permalinks)
 */
import { readFileSync } from 'node:fs'
import { chromium, type BrowserContext } from 'playwright'

const PROFILE = 'https://www.instagram.com/ruralhackers/'
const listFile = process.argv[2]

const normalise = (href: string) => {
  const m = /\/(?:([\w.]+)\/)?(p|reels?)\/([A-Za-z0-9_-]+)/.exec(href)
  return m ? `https://www.instagram.com/${m[2] === 'reels' ? 'reel' : m[2]}/${m[3]}/` : null
}

async function discover(ctx: BrowserContext): Promise<string[]> {
  const page = await ctx.newPage()
  await page.goto(PROFILE, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForTimeout(4000)
  // The grid keeps rendering behind the sign-up prompt for a while.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Escape').catch(() => {})
    await page.evaluate(() => window.scrollBy(0, 900))
    await page.waitForTimeout(1200)
  }
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')].map((a) =>
      a.getAttribute('href'),
    ),
  )
  await page.close()
  return [...new Set(hrefs.filter((h): h is string => !!h).map(normalise).filter((u): u is string => !!u))]
}

interface Post {
  url: string
  /** Date the post was published, from og:description. */
  date: string | null
  author: string | null
  caption: string
}

async function read(ctx: BrowserContext, url: string): Promise<Post> {
  const page = await ctx.newPage()
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
    await page.waitForTimeout(2500)
    const r = await page.evaluate(() => {
      const og = (document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null)?.content ?? ''
      return { og, time: document.querySelector('time')?.getAttribute('datetime') ?? null }
    })
    /*
     * og:description reads `<n> likes, <n> comments - <author> on <date>: "<caption>"`,
     * or without the counts for some posts. The date is taken from there rather than
     * from <time>, which on a post page can belong to the first comment: one post
     * reported 5 July in <time> and 2 July in the description.
     */
    const head = /^(?:[\d,]+ likes?, [\d,]+ comments? - )?([\w.]+) on ([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(r.og)
    // Instagram truncates og:description, so the closing quote is often absent —
    // anchoring on it dropped every caption. Cut at the opening one instead.
    const opened = r.og.indexOf(': "')
    const caption = (opened >= 0 ? r.og.slice(opened + 3) : r.og).replace(/"\s*$/, '')
    const posted = head?.[2] ? new Date(`${head[2]} UTC`).toISOString().slice(0, 10) : r.time?.slice(0, 10) ?? null
    return { url, date: posted, author: head?.[1] ?? null, caption: caption.replace(/\s+/g, ' ').trim() }
  } finally {
    await page.close()
  }
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } })

const urls = listFile
  ? readFileSync(listFile, 'utf8').split('\n').map((l) => normalise(l.trim())).filter((u): u is string => !!u)
  : await discover(ctx)

console.error(`reading ${urls.length} posts`)
const posts: Post[] = []
for (const u of urls) {
  try {
    posts.push(await read(ctx, u))
  } catch (e) {
    console.error(`  failed ${u}: ${e instanceof Error ? e.message.split('\n')[0] : e}`)
  }
}
await browser.close()

posts.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
console.log(JSON.stringify(posts, null, 2))
