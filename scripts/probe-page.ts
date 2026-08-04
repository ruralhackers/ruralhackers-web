/**
 * Prints the layout recipe of a page on the live site: its top-level sections
 * with the background, text colour, padding and width that a browser actually
 * computes, and inside each one the headings, images, quotes and buttons in
 * document order.
 *
 * This exists because the first attempt at porting pages composed them from the
 * archived markdown prose, which carries the words but none of the structure.
 * The result reproduced the design tokens and invented the layout. Reading the
 * rendered page is the difference between the two.
 *
 * Run: bun scripts/probe-page.ts /hacker-days/
 */
import { chromium } from 'playwright'

const path = process.argv[2] ?? '/'
const BASE = 'https://ruralhackers.com'

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 60_000 })

// lazysizes only swaps data-src into src once a node has been near the viewport.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 90))
  }
  window.scrollTo(0, 0)
})
await page.waitForTimeout(500)

const recipe = await page.evaluate(() => {
  const rgb = (v: string) => {
    const m = /rgba?\((\d+), (\d+), (\d+)/.exec(v)
    if (!m) return v
    const [r, g, b] = [m[1], m[2], m[3]].map(Number) as [number, number, number]
    const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
    const named: Record<string, string> = {
      '#ffffff': 'base',
      '#111111': 'contrast',
      '#e56529': 'accent-1',
      '#686868': 'accent-4',
      '#eeeeee': 'accent-5',
    }
    return named[hex] ?? hex
  }

  let root: Element = document.querySelector('main') ?? document.body
  while (root.children.length === 1) root = root.children[0]!

  const out: string[] = []
  ;[...root.children].forEach((sec, i) => {
    const s = getComputedStyle(sec)
    const r = sec.getBoundingClientRect()
    const bg = s.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'base' : rgb(s.backgroundColor)
    out.push(
      `\n── section ${i}  bg=${bg}  fg=${rgb(s.color)}  pad=${parseInt(s.paddingTop)}/${parseInt(s.paddingBottom)}  h=${Math.round(r.height)}`,
    )
    for (const el of sec.querySelectorAll('h1,h2,h3,h4,img,blockquote,a.wp-element-button,p')) {
      const t = el.tagName.toLowerCase()
      const box = el.getBoundingClientRect()
      const w = Math.round(box.width)
      const h = Math.round(box.height)
      if (t === 'img') {
        const src = ((el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src)
          .split('/uploads/')
          .pop()
        if (!src || src.startsWith('data:')) continue
        out.push(`   IMG   ${w}x${h}  ${src.split('?')[0]}`)
      } else if (t === 'a') {
        out.push(`   BTN   "${(el.textContent ?? '').trim().slice(0, 40)}"`)
      } else {
        const txt = (el.textContent ?? '').trim().replace(/\s+/g, ' ')
        if (!txt) continue
        const cs = getComputedStyle(el)
        const meta =
          t === 'p'
            ? `${cs.fontSize} ${cs.fontFamily.split(',')[0]!.replace(/"/g, '')} ${cs.textAlign}`
            : `${cs.fontSize} ${cs.fontWeight} ${cs.fontFamily.split(',')[0]!.replace(/"/g, '')} ${cs.textAlign}`
        out.push(`   ${t.toUpperCase().padEnd(5)} ${meta.padEnd(34)} ${txt.slice(0, 72)}`)
      }
    }
  })
  return out.join('\n')
})

console.log(`${BASE}${path}${recipe}`)
await browser.close()
