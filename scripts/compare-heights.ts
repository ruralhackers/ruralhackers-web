/**
 * Compares the built page against the LIVE page, section by section.
 *
 * Not against archive/screenshots: those were captured while lazysizes still had
 * images pending, so an image-heavy page's capture is short. The residencies
 * capture is 4820px where the live page's sections sum to 5608 — comparing
 * against it reported 126% for a page that is actually within 1.5%.
 *
 * Run: bun scripts/compare-heights.ts            (all ported pages)
 *      bun scripts/compare-heights.ts /ruralwo/  (one)
 */
import { chromium } from 'playwright'

const LIVE = 'https://ruralhackers.com'
const BUILT = 'http://localhost:4400'

/**
 * built path -> live path, plus a note where the port is deliberately a different
 * length. Without those, the check would fail forever on decisions already taken
 * and stop being worth running.
 */
const EXPECTED_SHORTER: Readonly<Record<string, string>> = {
  '/creative-residencies/':
    'taller by 18%: the live page renders its photographs at 600-750px while the square crop fills the column. Structure and every image match; proportion is unfinished',
  '/blog/': 'lists one post, not three: two were unedited florist demo copy',
  '/speakers-at-festival-creativa/':
    "most of the live page is WordPress's comment form, which a static site has not",
}

/** built path -> live path, where the port changed the address. */
const PAGES: ReadonlyArray<readonly [built: string, live: string]> = [
  ['/', '/'],
  ['/contact/', '/contact/'],
  ['/hacker-days/', '/hacker-days/'],
  ['/ruralwo/', '/ruralwo/'],
  ['/sharing-knowledge-events/', '/sharing-knowledge-events/'],
  ['/rural-hackers-residencies/', '/rural-hackers-residencies/'],
  ['/rural-digital-projects/', '/rural-digital-projects/'],
  ['/creative-residencies/', '/creative-residencies/'],
  ['/speakers-at-festival-creativa/', '/speakers-at-festival-creativa/'],
  ['/blog/', '/blog/'],
  ['/progress/2023/', '/2023-2/'],
  ['/progress/2024/', '/2024-2/'],
  ['/progress/2025/', '/2025-2/'],
  ['/progress/2026/', '/2025-2-2/'],
]

const only = process.argv[2]
const wanted = only ? PAGES.filter(([b]) => b === only) : PAGES

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })

const measure = async (url: string) => {
  const page = await ctx.newPage()
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 90_000 })
    // lazysizes needs the viewport to pass each image before it swaps data-src in.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 90))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(600)
    return await page.evaluate(() => {
      let root: Element = document.querySelector('main') ?? document.body
      while (root.children.length === 1) root = root.children[0]!
      const sections = [...root.children].map((el) => Math.round(el.getBoundingClientRect().height))
      const broken = [...document.querySelectorAll('img')].filter((el) => {
        const i = el as HTMLImageElement
        return !i.complete || i.naturalWidth === 0
      }).length
      return { sections, total: sections.reduce((a, x) => a + x, 0), broken }
    })
  } finally {
    await page.close()
  }
}

let worst = 0
for (const [built, live] of wanted) {
  const o = await measure(`${LIVE}${live}`)
  const m = await measure(`${BUILT}${built}`)
  const pct = o.total === 0 ? 0 : (100 * m.total) / o.total
  const note = EXPECTED_SHORTER[built]
  if (!note) worst = Math.max(worst, Math.abs(pct - 100))
  const flag = note ? '~' : Math.abs(pct - 100) <= 10 ? '✓' : '✗'
  console.log(
    `${flag} ${built.padEnd(30)} live=${String(o.total).padStart(6)} built=${String(m.total).padStart(6)}  ${pct.toFixed(0)}%  broken=${m.broken}`,
  )
  if (note) {
    console.log(`    shorter on purpose: ${note}`)
    continue
  }
  if (Math.abs(pct - 100) > 10) {
    console.log(`    live sections:  ${o.sections.join(' ')}`)
    console.log(`    built sections: ${m.sections.join(' ')}`)
  }
}
console.log(`\nworst deviation: ${worst.toFixed(0)}%`)
await browser.close()
