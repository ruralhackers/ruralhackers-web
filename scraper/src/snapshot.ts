import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { chromium, type Browser, type BrowserContext } from 'playwright'
import { USER_AGENT } from './config.ts'
import { urlToArchivePath, type SitemapEntry } from './discover.ts'

export interface SnapshotResult {
  url: string
  archivePath: string
  htmlPath: string
  desktopPath: string
  mobilePath: string
  status: 'captured' | 'skipped' | 'failed'
  error?: string
}

export function snapshotTargets(
  entries: readonly SitemapEntry[],
): { url: string; archivePath: string }[] {
  const seen = new Set<string>()
  const out: { url: string; archivePath: string }[] = []
  for (const e of entries) {
    if (seen.has(e.loc)) continue
    seen.add(e.loc)
    out.push({ url: e.loc, archivePath: urlToArchivePath(e.loc) })
  }
  return out
}

const done = async (path: string) => {
  try {
    return (await stat(path)).size > 0
  } catch {
    return false
  }
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const

/**
 * `load`, not `networkidle`. Some WordPress pages never reach network idle
 * because a script keeps polling, which sits at the timeout and kills the whole
 * stage over one page that curl fetches in 0.2s. `load` plus a bounded settle
 * captures the same pixels reliably and saves about 3s per viewport.
 */
const GOTO_OPTS = { waitUntil: 'load', timeout: 45_000 } as const
const SETTLE_MS = 800

async function capture(
  ctx: BrowserContext,
  url: string,
  shotPath: string,
  htmlPath: string | null,
): Promise<void> {
  const page = await ctx.newPage()
  try {
    await page.goto(url, GOTO_OPTS)
    await page.waitForTimeout(SETTLE_MS)
    // Lazy-loaded imagery only appears once the page has been scrolled.
    await page.evaluate(async () => {
      const step = window.innerHeight
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 100))
      }
      window.scrollTo(0, 0)
    })
    await mkdir(dirname(shotPath), { recursive: true })
    await page.screenshot({ path: shotPath, fullPage: true })
    if (htmlPath) {
      await mkdir(dirname(htmlPath), { recursive: true })
      await writeFile(htmlPath, await page.content(), 'utf8')
    }
  } finally {
    await page.close()
  }
}

export async function snapshotAll(
  targets: readonly { url: string; archivePath: string }[],
  outDir: string,
): Promise<SnapshotResult[]> {
  const browser: Browser = await chromium.launch()
  // Contexts are created once per viewport rather than per page: same isolation
  // of cookies and storage across the run, far less setup cost.
  const desktop = await browser.newContext({ viewport: VIEWPORTS.desktop, userAgent: USER_AGENT })
  const mobile = await browser.newContext({ viewport: VIEWPORTS.mobile, userAgent: USER_AGENT })

  const results: SnapshotResult[] = []
  try {
    for (const [i, t] of targets.entries()) {
      const htmlPath = join(outDir, 'pages-full', `${t.archivePath}.html`)
      const desktopPath = join(outDir, 'screenshots', `${t.archivePath}.desktop.png`)
      const mobilePath = join(outDir, 'screenshots', `${t.archivePath}.mobile.png`)

      if ((await done(htmlPath)) && (await done(desktopPath)) && (await done(mobilePath))) {
        results.push({ ...t, htmlPath, desktopPath, mobilePath, status: 'skipped' })
        continue
      }

      // One page failing must not lose the other 135. Failures are recorded and
      // reported at the end so a single flaky page is visible, not fatal.
      try {
        await capture(desktop, t.url, desktopPath, htmlPath)
        await capture(mobile, t.url, mobilePath, null)
        results.push({ ...t, htmlPath, desktopPath, mobilePath, status: 'captured' })
      } catch (e) {
        const error = e instanceof Error ? e.message.split('\n')[0]! : String(e)
        results.push({ ...t, htmlPath, desktopPath, mobilePath, status: 'failed', error })
        console.warn(`  failed ${t.archivePath}: ${error}`)
      }

      if ((i + 1) % 20 === 0) console.log(`  ...${i + 1}/${targets.length}`)
    }
  } finally {
    await desktop.close()
    await mobile.close()
    await browser.close()
  }
  return results
}
