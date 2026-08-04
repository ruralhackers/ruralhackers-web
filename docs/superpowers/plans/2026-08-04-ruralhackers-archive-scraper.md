# Rural Hackers Archive Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a resumable scraper that archives every page, post, image, font and stylesheet of the WordPress site at ruralhackers.com into `archive/`, and fails loudly if anything is missing.

**Architecture:** The archive scraper from `~/src/anceu-web-new` is copied into `scraper/src/` and adapted. Eight stages run in order, each resumable, each writing to a distinct subtree of `archive/`. All site-specific facts live in `config.ts` as enumerated constants; the `verify` stage asserts them. Three genuine bugs in the anceu version are fixed on the way — without them the site's three fonts and its compiled stylesheet would be silently absent from the archive.

**Tech Stack:** Node 24 (native TypeScript execution, no build step), TypeScript 7, vitest 4, playwright 1.62 (chromium), turndown 7.

## Global Constraints

- **Node >= 24.** Stages are run as `node scraper/src/cli.ts <stage>` with no transpile step. `.ts` extensions in imports are required (`allowImportingTsExtensions`).
- **`BASE_URL` is `https://ruralhackers.com`** — no trailing slash.
- **Expected counts are enumerated, never read from response headers:** `pages: 15, posts: 3, categories: 2, tags: 0, users: 5, media: 218`.
- **`media: 218` is deliberate.** `X-WP-Total` reports 220; paginating returns 98 + 100 + 20 = 218. Correcting this to 220 makes every run fail. The reason belongs in a code comment, not just here.
- **`link` is the only authoritative URL source.** The front page's slug is `home` but it is served at `/`. Never derive a URL from a slug.
- **Requests are strictly serial** with a 150 ms gap and 4 retries. This is a live production site on shared hosting.
- **TypeScript is `strict` with `noUncheckedIndexedAccess`.** Indexed access yields `T | undefined`; use `!` only where the index is provably in range.
- **Every stage is resumable.** Re-running after an interruption must continue, not restart.
- **`pnpm test` and `pnpm typecheck` must both pass before any commit.**

## Source of the copied code

Every file referenced as "copy from anceu" lives at:

```
~/src/anceu-web-new/scraper/src/<name>.ts
```

Copy the file and its `<name>.test.ts` sibling together.

**Test fixtures use `https://anceu.com` as their host.** For two files this is not cosmetic — the code under test compares against `BASE_URL`, so the fixtures must be rewritten to `https://ruralhackers.com` or the tests fail:

| File | Host swap |
| --- | --- |
| `media.test.ts` | **Mandatory** — `uploadPathFromUrl` and `harvestUploadUrls` filter on host |
| `verify.test.ts` | **Mandatory** — `checkReferencedImages` calls `uploadPathFromUrl` |
| `discover.test.ts`, `markdown.test.ts`, `snapshot.test.ts` | Cosmetic — pure parsing, but swap for coherence |
| `content.test.ts` | Fixture is rewritten wholesale in Task 5 |
| `http.test.ts`, `wp-client.test.ts`, `html-entities.test.ts`, `sniff.test.ts`, `checksums.test.ts` | None — no host in them |

## File Structure

```
package.json                    scripts, pinned deps
tsconfig.json                   strict, noEmit, nodenext
vitest.config.ts                include scraper/src/**/*.test.ts
.gitignore                       the three unversioned archive dirs
README.md                       how to run it, what's in the archive

scraper/src/
  config.ts        BASE_URL, USER_AGENT, EXPECTED, POST_TYPES, REQUIRED_ASSETS
  http.ts          serial fetch queue, retry with backoff        [copy verbatim]
  wp-client.ts     REST pagination, dedup by id                  [copy verbatim]
  html-entities.ts entity decoding for titles and Yoast fields    [copy verbatim]
  sniff.ts         mime from leading bytes            [copy + extend with fonts]
  checksums.ts     sha256 manifest of unversioned dirs           [copy verbatim]
  discover.ts      sitemaps -> url inventory, csv helper         [copy verbatim]
  markdown.ts      rendered html -> markdown + frontmatter       [copy verbatim]
  snapshot.ts      playwright full-page html + screenshots       [copy verbatim]
  media.ts         library + harvested downloads, manifest    [copy + 2 changes]
  content.ts       REST -> raw/html/seo, url-inventory.csv   [copy + kind union]
  verify.ts        completeness assertions            [copy + 2 changes]
  report.ts        archive/reports/inventory.md       [copy + retitle]
  cli.ts           stage runner                       [copy + reorder + wiring]
```

`config.ts` is the only file holding a fact about this particular site. Every other module reads facts from it.

## The three bugs being fixed

These were found by reading the anceu scraper against this site's actual markup, and each one loses data silently.

**1. `uploadPathFromUrl` rejects `http://` URLs.** It compares `u.origin !== new URL(BASE_URL).origin`. This site's font URLs are emitted as `http://ruralhackers.com/...` while `BASE_URL` is `https://`, so origin comparison rejects them. Fixed by comparing `hostname`. (Task 4)

**2. Theme assets are harvested from nothing.** `downloadMedia` harvests only from post content HTML. The three font files and the 80 KB compiled stylesheet are referenced *only* from the rendered page's inline `<style>` — they appear in no page's `content.rendered` and the media library contains zero non-image files. Fixed by feeding the snapshot stage's `pages-full/*.html` into the harvest, which requires `snapshot` to run before `media`. (Tasks 6 and 9)

**3. Nothing asserts the fonts arrived.** Even with 1 and 2 fixed, a future change could silently drop them again. Fixed with a `REQUIRED_ASSETS` list that `verify` checks. (Task 7)

Verified against the live site on 2026-08-04:

```
uploads/fonts/Inter-VariableFont_opszwght.ttf   http://, not in library, not in any content.rendered
uploads/fonts/OffBitTrial-101.otf               idem
uploads/fonts/OffBitTrial-101Bold.otf           idem
media library mime types: image/jpeg, image/png, image/webp only
```

---

### Task 1: Scaffold and the host-independent modules

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`
- Modify: `.gitignore`
- Create: `scraper/src/config.ts`
- Create (copy verbatim, with tests): `scraper/src/http.ts`, `wp-client.ts`, `html-entities.ts`, `sniff.ts`, `checksums.ts`
- Test: `scraper/src/config.test.ts` plus the five copied `*.test.ts` files

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `config.ts`: `BASE_URL: string`, `USER_AGENT: string`, `REQUEST_GAP_MS: number`, `MAX_RETRIES: number`, `ARCHIVE_DIR: string`, `EXPECTED: Readonly<{pages,posts,categories,tags,users,media: number}>`, `POST_TYPES: Readonly<{pages: 'pages', posts: 'posts'}>`, `REQUIRED_ASSETS: readonly string[]`
  - `http.ts`: `createHttp(opts?: {fetcher?, gapMs?, retries?}): Http` where `Http = { json<T>(url): Promise<T>; text(url): Promise<string>; buffer(url): Promise<Uint8Array>; head(url): Promise<Headers> }`
  - `wp-client.ts`: `fetchAll<T extends {id: number}>(http: Http, endpoint: string, params?: Record<string,string>): Promise<T[]>`, plus `WpItem` and `WpMedia` interfaces
  - `html-entities.ts`: `decodeEntities(input: string): string`
  - `sniff.ts`: `sniffMime(bytes: Uint8Array): string | null`
  - `checksums.ts`: `writeChecksums(outDir: string): Promise<{path: string; count: number; bytes: number}>`, `formatChecksumFile(entries: readonly ChecksumEntry[]): string`, `UNVERSIONED_DIRS`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ruralhackers-web",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "archive": "node scraper/src/cli.ts all",
    "archive:discover": "node scraper/src/cli.ts discover",
    "archive:content": "node scraper/src/cli.ts content",
    "archive:snapshot": "node scraper/src/cli.ts snapshot",
    "archive:media": "node scraper/src/cli.ts media",
    "archive:markdown": "node scraper/src/cli.ts markdown",
    "archive:verify": "node scraper/src/cli.ts verify",
    "archive:report": "node scraper/src/cli.ts report",
    "archive:checksums": "node scraper/src/cli.ts checksums"
  },
  "devDependencies": {
    "@types/node": "26.1.2",
    "@types/turndown": "5.0.6",
    "playwright": "1.62.1",
    "turndown": "7.2.4",
    "typescript": "7.0.2",
    "vitest": "4.1.10"
  }
}
```

Note the script order: `snapshot` precedes `media`, unlike the anceu repo. Task 9 explains why.

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "types": ["node"],
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["scraper/src"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['scraper/src/**/*.test.ts'] },
})
```

- [ ] **Step 4: Replace `.gitignore`**

The current file only ignores `archive/media/`. All three directories in `UNVERSIONED_DIRS` must be ignored, or the screenshots and full-page HTML get committed.

```
node_modules/
dist/
.astro/
.netlify/
.env
.env.*
.cache/
.DS_Store
*.log

# The three directories checksums.ts treats as unversioned. They are too large
# for git and are the parts that cannot be regenerated once WordPress is off.
# archive/reports/checksums.sha256 IS committed, so the backup stays verifiable
# with `sha256sum -c` and needs nothing from this repo.
archive/media/
archive/screenshots/
archive/pages-full/

# brainstorming visual companion
.superpowers/
```

- [ ] **Step 5: Write the failing config test**

Create `scraper/src/config.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { BASE_URL, EXPECTED, POST_TYPES, REQUIRED_ASSETS } from './config.ts'

describe('config', () => {
  it('points at ruralhackers over https with no trailing slash', () => {
    expect(BASE_URL).toBe('https://ruralhackers.com')
  })

  it('expects 218 media, not the 220 the api header claims', () => {
    // X-WP-Total says 220; pagination returns 98 + 100 + 20 = 218. Changing
    // this to 220 makes every verification run fail forever.
    expect(EXPECTED.media).toBe(218)
  })

  it('enumerates every count the verify stage checks', () => {
    expect(EXPECTED).toEqual({
      pages: 15,
      posts: 3,
      categories: 2,
      tags: 0,
      users: 5,
      media: 218,
    })
  })

  it('archives only pages and posts, since this site has no custom post types', () => {
    expect(Object.keys(POST_TYPES)).toEqual(['pages', 'posts'])
  })

  it('requires the three theme fonts, which no other source would catch', () => {
    expect(REQUIRED_ASSETS).toEqual([
      'uploads/fonts/Inter-VariableFont_opszwght.ttf',
      'uploads/fonts/OffBitTrial-101.otf',
      'uploads/fonts/OffBitTrial-101Bold.otf',
    ])
  })
})
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `pnpm install && pnpm vitest run scraper/src/config.test.ts`
Expected: FAIL — `Failed to resolve import "./config.ts"`

- [ ] **Step 7: Create `scraper/src/config.ts`**

```ts
export const BASE_URL = 'https://ruralhackers.com'

/**
 * A browser UA. ruralhackers.com serves a default `curl` UA fine, unlike
 * anceu.com which 403s unknown agents — this is insurance, not a workaround for
 * an observed failure.
 */
export const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** Live production site on shared hosting (Hostinger/LiteSpeed). Serial, gapped. */
export const REQUEST_GAP_MS = 150
export const MAX_RETRIES = 4

export const ARCHIVE_DIR = 'archive'

/**
 * Enumerated against the live REST API on 2026-08-04.
 *
 * Media is deliberately 218, the retrievable count, not the 220 that
 * `X-WP-Total` reports. Paginating at 100/page returns 98 + 100 + 20 = 218,
 * consistently. The 2-item delta is a WordPress count-vs-query mismatch: the
 * count includes attachments the public REST API will not serve. The same bug
 * exists on anceu.com, where it overreports by 61.
 *
 * Do not "fix" this to 220 — it will fail every run.
 *
 * `tags: 0` is correct: this site has no tags at all.
 */
export const EXPECTED = {
  pages: 15,
  posts: 3,
  categories: 2,
  tags: 0,
  users: 5,
  media: 218,
} as const satisfies Readonly<Record<string, number>>

/** No custom post types. Twenty Twenty-Five plus Twentig adds none. */
export const POST_TYPES = {
  pages: 'pages',
  posts: 'posts',
} as const

/**
 * Assets referenced only from a rendered page's inline `<style>`.
 *
 * These three fonts are in no page's `content.rendered` and the media library
 * holds nothing but images, so no stage would notice their absence. They are the
 * site's entire typography — Inter for body, OffBit Trial for display — and are
 * unrecoverable once WordPress is switched off. `verify` asserts them.
 *
 * Note that "OffBit Trial" is a trial licence, which phase 2 must resolve before
 * going live. Archiving it is still correct: you cannot decide what to replace
 * without the metrics of what is there.
 */
export const REQUIRED_ASSETS = [
  'uploads/fonts/Inter-VariableFont_opszwght.ttf',
  'uploads/fonts/OffBitTrial-101.otf',
  'uploads/fonts/OffBitTrial-101Bold.otf',
] as const
```

- [ ] **Step 8: Run the config test to verify it passes**

Run: `pnpm vitest run scraper/src/config.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 9: Copy the five host-independent modules with their tests**

Copy each file and its test sibling from `~/src/anceu-web-new/scraper/src/` unchanged:

```bash
SRC=~/src/anceu-web-new/scraper/src
for f in http wp-client html-entities sniff checksums; do
  cp "$SRC/$f.ts" "$SRC/$f.test.ts" scraper/src/
done
```

None of these five tests contain a host, so they pass unmodified.

- [ ] **Step 10: Update the one comment that names the wrong site**

In `checksums.ts`, `UNVERSIONED_DIRS`'s doc comment says "once anceu.com stops serving". Change to "once ruralhackers.com stops serving".

- [ ] **Step 11: Run the full suite and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: PASS. All six test files green, no type errors.

- [ ] **Step 12: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore scraper/src
git commit -m "feat(scraper): scaffold, config and the host-independent modules"
```

---

### Task 2: Sitemap discovery, markdown conversion, snapshots

**Files:**
- Create (copy, tests' fixtures rehosted): `scraper/src/discover.ts`, `markdown.ts`, `snapshot.ts`
- Test: `scraper/src/discover.test.ts`, `markdown.test.ts`, `snapshot.test.ts`

**Interfaces:**
- Consumes: `Http` from `http.ts`, `decodeEntities` from `html-entities.ts`, `USER_AGENT` and `BASE_URL` from `config.ts`, `canonicalName` and `MediaRecord` from `media.ts` (Task 4).
- Produces:
  - `discover.ts`: `SitemapEntry = { loc: string; lastmod?: string; source: string }`, `discoverUrls(http: Http): Promise<SitemapEntry[]>`, `parseSitemapLocs(xml: string): {loc: string; lastmod?: string}[]`, `urlToArchivePath(url: string): string`, `toCsv(rows, columns): string`
  - `markdown.ts`: `writeMarkdown(items: readonly ArchivedItemLike[], media: readonly MediaRecord[], outDir: string): Promise<void>`, `htmlToMarkdown(html, knownBasenames): string`, `frontmatter(fields): string`, `normalizeUploadUrl(src, knownBasenames): string`, `basenameOf(url): string`
  - `snapshot.ts`: `snapshotTargets(entries: readonly SitemapEntry[]): {url: string; archivePath: string}[]`, `snapshotAll(targets, outDir): Promise<SnapshotResult[]>` where `SnapshotResult = { url, archivePath, htmlPath, desktopPath, mobilePath, status: 'captured'|'skipped'|'failed', error?: string }`

`markdown.ts` imports from `media.ts`, which Task 4 creates. Expect a resolve error until then; that is why this task's verification is scoped to `discover` and `snapshot`, with `markdown` verified in Task 4.

- [ ] **Step 1: Copy the three modules and their tests**

```bash
SRC=~/src/anceu-web-new/scraper/src
for f in discover markdown snapshot; do
  cp "$SRC/$f.ts" "$SRC/$f.test.ts" scraper/src/
done
```

- [ ] **Step 2: Rehost the test fixtures**

In `discover.test.ts`, `markdown.test.ts` and `snapshot.test.ts`, replace every `anceu.com` with `ruralhackers.com`. These three modules are host-agnostic, so this is for coherence rather than correctness — but leaving a rival site's domain in this repo's fixtures is the kind of thing that misleads the next reader.

Two fixtures name specific anceu pages. Replace them with real ruralhackers URLs so the fixtures document this site:

- `discover.test.ts`: `urlToArchivePath('https://ruralhackers.com/the-space/')` becomes `urlToArchivePath('https://ruralhackers.com/hacker-days/')` expecting `'hacker-days'`; the nested-category case becomes `urlToArchivePath('https://ruralhackers.com/category/uncategorized-en/')` expecting `'category/uncategorized-en'`.
- `discover.test.ts`: the `parseSitemapLocs` urlset fixture's two `<loc>` values become `https://ruralhackers.com/hacker-days/` and `https://ruralhackers.com/about/`, with the expectation updated to match.

- [ ] **Step 3: Fix the snapshot comment that cites an anceu page**

`snapshot.ts`'s `GOTO_OPTS` comment explains why `load` is used instead of `networkidle`, naming `/happy-second-birthday-anceu-coliving.../`. The reasoning still applies — keep it — but make it site-neutral:

```ts
/**
 * `load`, not `networkidle`. Some WordPress pages never reach network idle
 * because a script keeps polling, which sits at the timeout and kills the whole
 * stage over one page that curl fetches in 0.2s. `load` plus a bounded settle
 * captures the same pixels reliably and saves about 3s per viewport.
 */
```

- [ ] **Step 4: Run the two verifiable test files**

Run: `pnpm vitest run scraper/src/discover.test.ts scraper/src/snapshot.test.ts`
Expected: PASS. `markdown.test.ts` will fail to resolve `./media.ts` — expected, fixed in Task 4.

- [ ] **Step 5: Commit**

```bash
git add scraper/src
git commit -m "feat(scraper): sitemap discovery, markdown conversion and snapshots"
```

---

### Task 3: Teach `sniffMime` to recognise fonts

**Files:**
- Modify: `scraper/src/sniff.ts`
- Test: `scraper/src/sniff.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `sniffMime(bytes: Uint8Array): string | null` — unchanged signature, now also returning `'font/otf'`, `'font/ttf'`, `'font/woff'` and `'font/woff2'`.

The archive is about to start holding `.otf` and `.ttf` files. Without this, `report.ts` files them under `unknown` and the inventory misrepresents what was captured.

- [ ] **Step 1: Write the failing tests**

Append to `scraper/src/sniff.test.ts`:

```ts
describe('sniffMime on fonts', () => {
  const bytesOf = (...parts: (string | number[])[]): Uint8Array => {
    const out: number[] = []
    for (const p of parts) {
      if (typeof p === 'string') out.push(...[...p].map((c) => c.charCodeAt(0)))
      else out.push(...p)
    }
    return new Uint8Array(out)
  }

  it('identifies a CFF-flavoured OpenType font by its OTTO tag', () => {
    // OffBitTrial-101.otf, the site's display face.
    expect(sniffMime(bytesOf('OTTO', [0x00, 0x0d, 0x00, 0x80]))).toBe('font/otf')
  })

  it('identifies a TrueType font by its 0x00010000 version', () => {
    // Inter-VariableFont_opszwght.ttf, the site's body face.
    expect(sniffMime(bytesOf([0x00, 0x01, 0x00, 0x00], [0x00, 0x11, 0x00, 0x80]))).toBe('font/ttf')
  })

  it('identifies the legacy `true` TrueType tag', () => {
    expect(sniffMime(bytesOf('true', [0x00, 0x0a]))).toBe('font/ttf')
  })

  it('identifies woff and woff2 separately', () => {
    expect(sniffMime(bytesOf('wOFF', 'OTTO'))).toBe('font/woff')
    expect(sniffMime(bytesOf('wOF2', 'OTTO'))).toBe('font/woff2')
  })

  it('still returns null for bytes it cannot place', () => {
    expect(sniffMime(bytesOf('not a known format at all'))).toBeNull()
  })

  it('does not mistake a jpeg for a font', () => {
    expect(sniffMime(bytesOf([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
  })
})
```

- [ ] **Step 2: Run to verify the font tests fail**

Run: `pnpm vitest run scraper/src/sniff.test.ts`
Expected: FAIL — the four font assertions return `null`, the jpeg and null cases already pass.

- [ ] **Step 3: Add font detection to `sniff.ts`**

Insert immediately before the ISO-BMFF `ftyp` block, so the `0x00010000` check cannot be shadowed:

```ts
  // Fonts. The archive holds the theme's .otf and .ttf faces, which are
  // referenced only from a rendered page's inline <style> and appear in no
  // media library listing.
  if (ascii(0, 'OTTO')) return 'font/otf'
  if (ascii(0, 'wOFF')) return 'font/woff'
  if (ascii(0, 'wOF2')) return 'font/woff2'
  if (ascii(0, 'true') || ascii(0, 'ttcf')) return 'font/ttf'
  if (at(0) === 0x00 && at(1) === 0x01 && at(2) === 0x00 && at(3) === 0x00) return 'font/ttf'
```

- [ ] **Step 4: Run to verify all sniff tests pass**

Run: `pnpm vitest run scraper/src/sniff.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scraper/src/sniff.ts scraper/src/sniff.test.ts
git commit -m "feat(scraper): identify font files from their leading bytes"
```

---

### Task 4: Media downloads, and the `http://` bug that loses the fonts

**Files:**
- Create (copy, then modify): `scraper/src/media.ts`
- Test: `scraper/src/media.test.ts`

**Interfaces:**
- Consumes: `Http`, `BASE_URL`, `EXPECTED`, `sniffMime`, `fetchAll`, `WpMedia`.
- Produces:
  - `MediaRecord` — the full interface as copied, with fields `id: number | null`, `url: string`, `localPath: string`, `mime: string`, `alt: string`, `caption: string`, `width: number | null`, `height: number | null`, `filesize: number | null`, `bytes: number | null`, `actualMime: string | null`, `source: 'library' | 'harvested'`, `fallbackUrl?: string`, `status: 'downloaded' | 'missing-at-source'`
  - `downloadMedia(http: Http, outDir: string, extraHtml: readonly string[]): Promise<MediaRecord[]>`
  - `uploadPathFromUrl(url: string): string | null`
  - `harvestUploadUrls(html: string): string[]`
  - `canonicalPath(pathOrUrl: string): string`, `canonicalName(pathOrUrl: string): string`, `stripSizeSuffix(path: string): string`

- [ ] **Step 1: Copy `media.ts` and its test**

```bash
SRC=~/src/anceu-web-new/scraper/src
cp "$SRC/media.ts" "$SRC/media.test.ts" scraper/src/
```

- [ ] **Step 2: Rehost the mandatory fixtures**

In `media.test.ts`, replace every `anceu.com` with `ruralhackers.com`. This is **required**, not cosmetic: `uploadPathFromUrl` and `harvestUploadUrls` filter on host, so anceu fixtures now return `null` and five assertions fail. Also rename the two anceu-flavoured image basenames (`Anceu.jpeg`, `Anceu-new-Season`) to neutral ones (`Hacker-Days.jpeg`, `Hacker-Days`), updating both sides of each assertion.

Run: `pnpm vitest run scraper/src/media.test.ts`
Expected: PASS after rehosting. If anything still fails, a fixture was missed.

- [ ] **Step 3: Write the failing test for the `http://` bug**

Append to `media.test.ts`:

```ts
describe('uploadPathFromUrl protocol handling', () => {
  it('accepts an http:// upload url even though BASE_URL is https', () => {
    // The theme emits its @font-face src as http://, and comparing URL.origin
    // rejects it because the origin includes the scheme. The three fonts that
    // are the site's entire typography would be silently absent from the
    // archive, and only discovered after WordPress was switched off.
    expect(
      uploadPathFromUrl('http://ruralhackers.com/wp-content/uploads/fonts/OffBitTrial-101.otf'),
    ).toBe('uploads/fonts/OffBitTrial-101.otf')
  })

  it('accepts the https form of the same path identically', () => {
    expect(
      uploadPathFromUrl('https://ruralhackers.com/wp-content/uploads/fonts/OffBitTrial-101.otf'),
    ).toBe('uploads/fonts/OffBitTrial-101.otf')
  })

  it('still refuses a different host', () => {
    expect(uploadPathFromUrl('https://example.com/wp-content/uploads/2026/06/a.jpeg')).toBeNull()
  })

  it('still refuses a path outside uploads', () => {
    expect(
      uploadPathFromUrl('http://ruralhackers.com/wp-content/themes/twentytwentyfive/style.css'),
    ).toBeNull()
  })
})

describe('harvestUploadUrls on theme markup', () => {
  it('finds the fonts in an inline @font-face block', () => {
    const html = `<style>
      @font-face{font-family:"OffBit Trial";
        src:url('http://ruralhackers.com/wp-content/uploads/fonts/OffBitTrial-101.otf') format('opentype')}
      @font-face{font-family:Inter;
        src:url('http://ruralhackers.com/wp-content/uploads/fonts/Inter-VariableFont_opszwght.ttf')}
    </style>`
    expect(harvestUploadUrls(html)).toEqual([
      'http://ruralhackers.com/wp-content/uploads/fonts/OffBitTrial-101.otf',
      'http://ruralhackers.com/wp-content/uploads/fonts/Inter-VariableFont_opszwght.ttf',
    ])
  })

  it('finds the compiled stylesheet, which lives under uploads too', () => {
    const html = `<link rel="stylesheet" href="https://ruralhackers.com/wp-content/uploads/siteground-optimizer-assets/combined-css-943b3f.css">`
    expect(harvestUploadUrls(html)).toEqual([
      'https://ruralhackers.com/wp-content/uploads/siteground-optimizer-assets/combined-css-943b3f.css',
    ])
  })
})
```

- [ ] **Step 4: Run to verify the new tests fail**

Run: `pnpm vitest run scraper/src/media.test.ts`
Expected: FAIL — the `http://` cases return `null`, and both `harvestUploadUrls` cases return `[]` because the harvest filters through `uploadPathFromUrl`.

- [ ] **Step 5: Fix `uploadPathFromUrl` to compare hostname**

Replace the origin comparison in `media.ts`:

```ts
export function uploadPathFromUrl(url: string): string | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  // Hostname, not origin: origin includes the scheme, and the theme emits its
  // @font-face `src` over http:// while BASE_URL is https://. Comparing origins
  // drops all three of the site's fonts.
  if (u.hostname !== new URL(BASE_URL).hostname) return null
  const m = /^\/wp-content\/(uploads\/.+)$/.exec(u.pathname)
  return m?.[1] ?? null
}
```

- [ ] **Step 6: Run to verify every media test passes**

Run: `pnpm vitest run scraper/src/media.test.ts`
Expected: PASS

- [ ] **Step 7: Verify `markdown.test.ts` now resolves**

Run: `pnpm vitest run scraper/src/markdown.test.ts && pnpm typecheck`
Expected: PASS. `markdown.ts`'s import of `canonicalName` from `media.ts` now resolves.

- [ ] **Step 8: Commit**

```bash
git add scraper/src/media.ts scraper/src/media.test.ts
git commit -m "fix(scraper): accept http:// upload urls, which the theme uses for its fonts"
```

---

### Task 5: Content extraction

**Files:**
- Create (copy, then modify): `scraper/src/content.ts`
- Test: `scraper/src/content.test.ts`

**Interfaces:**
- Consumes: `Http`, `EXPECTED`, `POST_TYPES`, `toCsv`, `urlToArchivePath`, `decodeEntities`, `fetchAll`, `WpItem`.
- Produces:
  - `ArchivedItem = { kind: 'pages' | 'posts'; id: number; slug: string; url: string; archivePath: string; title: string; html: string; seo: Record<string, unknown> }`
  - `extractContent(http: Http, outDir: string): Promise<ArchivedItem[]>`
  - `seoRow(item: ArchivedItem): Record<string, string>`

The only code change is the `kind` union: anceu's includes `'accommodations'`, which this site has no equivalent of. The taxonomy loop already reads its expectations from `EXPECTED`, so `tags: 0` needs nothing special — `fetchAll` returns `[]` on an endpoint whose first page is empty, and `0 !== 0` is false.

- [ ] **Step 1: Copy `content.ts` and its test**

```bash
SRC=~/src/anceu-web-new/scraper/src
cp "$SRC/content.ts" "$SRC/content.test.ts" scraper/src/
```

- [ ] **Step 2: Narrow the `kind` union and correct the slug comment**

In `content.ts`, change the interface field:

```ts
export interface ArchivedItem {
  kind: 'pages' | 'posts'
```

and replace the comment above `urlToArchivePath` in `extractContent`:

```ts
      // `link` is authoritative. The page slugged `home` is served at "/".
      const archivePath = urlToArchivePath(r.link)
```

- [ ] **Step 3: Rewrite the test fixture with this site's real data**

Replace the `item` fixture at the top of `content.test.ts`, and every assertion that echoes it, with the front page of this site. Its values were read from the live API:

```ts
const item: ArchivedItem = {
  kind: 'pages',
  id: 13,
  slug: 'home',
  url: 'https://ruralhackers.com/',
  archivePath: 'index',
  title: 'Rural Hackers',
  html: '<p>hi</p>',
  seo: {
    title: 'Rural Hackers – A movement for the revitalization of rural life',
    description: 'A movement for the revitalization of rural life',
    canonical: 'https://ruralhackers.com/',
    robots: { index: 'index', follow: 'follow' },
    og_title: 'Rural Hackers',
  },
}
```

Update the first test's expectation to match, keeping `id: '13'` as a string and `archive_path: 'index'`:

```ts
describe('seoRow', () => {
  it('flattens the fields phase 2 is validated against', () => {
    expect(seoRow(item)).toEqual({
      url: 'https://ruralhackers.com/',
      kind: 'pages',
      id: '13',
      slug: 'home',
      archive_path: 'index',
      title: 'Rural Hackers – A movement for the revitalization of rural life',
      description: 'A movement for the revitalization of rural life',
      canonical: 'https://ruralhackers.com/',
      robots: 'index, follow',
      og_title: 'Rural Hackers',
    })
  })
```

For the remaining four tests, keep their logic and swap only the anceu strings:

- "falls back to the post title when yoast has none" → expects `'Rural Hackers'`
- "leaves description and canonical empty rather than inventing them" → unchanged
- "decodes html entities" → keep the `&amp;` / `&#8217;` / `&#8211;` fixtures, they exercise the decoder and are site-neutral
- "decodes entities in the fallback title too" → title `'Rural Hackers &amp; Friends'`, expecting `'Rural Hackers & Friends'`

- [ ] **Step 4: Add a test pinning the front-page slug trap**

Append to `content.test.ts`:

```ts
describe('archivePath', () => {
  it('records the front page at index, not at its slug', () => {
    // page_on_front is 13, whose slug is `home` but which is served at "/".
    // Deriving the path from the slug would file the homepage under `home`
    // and phase 2 would rebuild the site's most valuable url at /home/.
    expect(item.archivePath).toBe('index')
    expect(item.slug).toBe('home')
  })
})
```

- [ ] **Step 5: Run the content tests**

Run: `pnpm vitest run scraper/src/content.test.ts && pnpm typecheck`
Expected: PASS, 6 tests, no type errors

- [ ] **Step 6: Commit**

```bash
git add scraper/src/content.ts scraper/src/content.test.ts
git commit -m "feat(scraper): content extraction for pages and posts"
```

---

### Task 6: Harvest theme assets from the rendered pages

**Files:**
- Modify: `scraper/src/media.ts`
- Test: `scraper/src/media.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `readRenderedPages(outDir: string): Promise<string[]>` — the HTML of every file under `<outDir>/pages-full/`, recursively. Returns `[]` when the directory does not exist, so the media stage still runs before a snapshot has ever been taken.

`downloadMedia`'s signature does not change: it already accepts `extraHtml: readonly string[]`. The caller (Task 9) concatenates post-content HTML with the output of this function.

- [ ] **Step 1: Write the failing test**

`media.test.ts` already imports from `./media.ts` as a multi-line list. **Add `readRenderedPages` to that existing import** rather than writing a second `import` from the same module, and add the three node imports at the top of the file:

```ts
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  canonicalName,
  canonicalPath,
  harvestUploadUrls,
  readRenderedPages,
  stripSizeSuffix,
  uploadPathFromUrl,
} from './media.ts'
```

Then append the test block:

```ts
describe('readRenderedPages', () => {
  it('reads every rendered page, including ones in subdirectories', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rh-archive-'))
    await mkdir(join(dir, 'pages-full', 'category'), { recursive: true })
    await writeFile(join(dir, 'pages-full', 'index.html'), '<html>home</html>', 'utf8')
    await writeFile(join(dir, 'pages-full', 'about.html'), '<html>about</html>', 'utf8')
    // archivePath keeps the url's shape, so /category/uncategorized/ nests.
    await writeFile(
      join(dir, 'pages-full', 'category', 'uncategorized.html'),
      '<html>cat</html>',
      'utf8',
    )

    expect(new Set(await readRenderedPages(dir))).toEqual(
      new Set(['<html>home</html>', '<html>about</html>', '<html>cat</html>']),
    )
  })

  it('ignores non-html files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rh-archive-'))
    await mkdir(join(dir, 'pages-full'), { recursive: true })
    await writeFile(join(dir, 'pages-full', 'index.html'), '<html>ok</html>', 'utf8')
    await writeFile(join(dir, 'pages-full', 'notes.txt'), 'ignore me', 'utf8')

    expect(await readRenderedPages(dir)).toEqual(['<html>ok</html>'])
  })

  it('returns empty rather than throwing when no snapshot exists yet', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rh-archive-'))
    expect(await readRenderedPages(dir)).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run scraper/src/media.test.ts`
Expected: FAIL — `readRenderedPages` is not exported from `media.ts`

- [ ] **Step 3: Implement `readRenderedPages`**

Add to `media.ts`. Extend the existing `node:fs/promises` import with `readdir` and `readFile`:

```ts
import { mkdir, open, readdir, readFile, stat, writeFile } from 'node:fs/promises'
```

Then add the function near the other exported helpers:

```ts
/**
 * The rendered pages the snapshot stage captured.
 *
 * This is the second source the media stage harvests from, and it is the only
 * one that sees the theme's own assets: the three fonts and the 80 KB compiled
 * stylesheet are referenced from a rendered page's inline `<style>`, appear in
 * no page's `content.rendered`, and are absent from a media library that holds
 * nothing but images. Harvesting post content alone loses all four files.
 *
 * Returns `[]` when `pages-full/` does not exist, so `media` still runs on a
 * fresh archive that has not been snapshotted yet.
 */
export async function readRenderedPages(outDir: string): Promise<string[]> {
  const walk = async (dir: string): Promise<string[]> => {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const out: string[] = []
    for (const e of entries) {
      const p = join(dir, e.name)
      if (e.isDirectory()) out.push(...(await walk(p)))
      else if (e.name.endsWith('.html')) out.push(await readFile(p, 'utf8'))
    }
    return out
  }
  return walk(join(outDir, 'pages-full'))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run scraper/src/media.test.ts && pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scraper/src/media.ts scraper/src/media.test.ts
git commit -m "feat(scraper): harvest theme assets from the rendered pages"
```

---

### Task 7: Verification, including the assets nothing else would notice

**Files:**
- Create (copy, then modify): `scraper/src/verify.ts`
- Test: `scraper/src/verify.test.ts`

**Interfaces:**
- Consumes: `EXPECTED`, `REQUIRED_ASSETS`, `canonicalPath`, `uploadPathFromUrl`, `MediaRecord`.
- Produces:
  - `Problem = { rule: string; detail: string; severity: 'error' | 'warning' }`
  - `verifyArchive(outDir: string): Promise<Problem[]>`
  - `checkCounts(actual: Readonly<Record<string, number>>): Problem[]`
  - `checkReferencedImages(markdown: readonly {file: string; body: string}[], manifest: readonly MediaRecord[]): Problem[]`
  - `checkRequiredAssets(manifest: readonly MediaRecord[]): Problem[]`

Three changes: drop the `accommodations` count, rehost the fixtures, and add the required-assets rule.

- [ ] **Step 1: Copy `verify.ts` and its test**

```bash
SRC=~/src/anceu-web-new/scraper/src
cp "$SRC/verify.ts" "$SRC/verify.test.ts" scraper/src/
```

- [ ] **Step 2: Drop `accommodations` and rehost the strings**

In `verify.ts`'s `verifyArchive`, remove the `accommodations` line from the `checkCounts` call so the object matches `EXPECTED`'s six keys exactly:

```ts
    ...checkCounts({
      pages: await count('pages'),
      posts: await count('posts'),
      categories: await jsonLen('categories.json'),
      tags: await jsonLen('tags.json'),
      users: await jsonLen('users.json'),
      media: manifest.filter((m) => m.source === 'library').length,
    }),
```

Replace `anceu.com` with `ruralhackers.com` in the two `Problem` detail strings and in the `severity: 'warning'` doc comment. In `verify.test.ts`, replace every `anceu.com` with `ruralhackers.com` — **mandatory**, since `checkReferencedImages` filters markdown refs through `uploadPathFromUrl`, and anceu-hosted refs now return `null`, silently producing zero problems where the tests expect one.

Run: `pnpm vitest run scraper/src/verify.test.ts`
Expected: PASS after rehosting.

- [ ] **Step 3: Write the failing test for the required-assets rule**

`verify.test.ts` already imports `{ checkCounts, checkReferencedImages }` from `./verify.ts` and `type { MediaRecord }` from `./media.ts`. **Extend the first import** — do not add a second `import` from the same module — so it reads:

```ts
import { checkCounts, checkReferencedImages, checkRequiredAssets } from './verify.ts'
```

`MediaRecord` is already imported, so the fixture below compiles as written. Append the test block:

```ts
describe('checkRequiredAssets', () => {
  const asset = (localPath: string, status: MediaRecord['status']): MediaRecord => ({
    id: null,
    url: `http://ruralhackers.com/wp-content/${localPath}`,
    localPath,
    mime: '',
    alt: '',
    caption: '',
    width: null,
    height: null,
    filesize: null,
    bytes: 1024,
    actualMime: 'font/otf',
    source: 'harvested',
    status,
  })

  const allThree = [
    'uploads/fonts/Inter-VariableFont_opszwght.ttf',
    'uploads/fonts/OffBitTrial-101.otf',
    'uploads/fonts/OffBitTrial-101Bold.otf',
  ]

  it('passes when every required asset was downloaded', () => {
    expect(checkRequiredAssets(allThree.map((p) => asset(p, 'downloaded')))).toEqual([])
  })

  it('errors on a required asset absent from the manifest entirely', () => {
    const manifest = allThree.slice(0, 2).map((p) => asset(p, 'downloaded'))
    const problems = checkRequiredAssets(manifest)
    expect(problems).toHaveLength(1)
    expect(problems[0]!.rule).toBe('required-asset-missing')
    expect(problems[0]!.severity).toBe('error')
    expect(problems[0]!.detail).toContain('OffBitTrial-101Bold.otf')
  })

  it('errors on a required asset that is in the manifest but never downloaded', () => {
    const manifest = [
      asset(allThree[0]!, 'downloaded'),
      asset(allThree[1]!, 'downloaded'),
      asset(allThree[2]!, 'missing-at-source'),
    ]
    const problems = checkRequiredAssets(manifest)
    expect(problems).toHaveLength(1)
    expect(problems[0]!.rule).toBe('required-asset-missing')
    expect(problems[0]!.severity).toBe('error')
  })

  it('compares decoded paths, so an encoded manifest path still matches', () => {
    const manifest = allThree.map((p) => asset(p.replace(/_/g, '%5F'), 'downloaded'))
    // Only the Inter filename contains an underscore; the other two match plainly.
    expect(checkRequiredAssets(manifest)).toEqual([])
  })
})
```

- [ ] **Step 4: Run to verify it fails**

Run: `pnpm vitest run scraper/src/verify.test.ts`
Expected: FAIL — `checkRequiredAssets` is not exported from `verify.ts`

- [ ] **Step 5: Implement `checkRequiredAssets` and wire it in**

Add to `verify.ts`, importing `REQUIRED_ASSETS` alongside `EXPECTED`:

```ts
import { EXPECTED, REQUIRED_ASSETS } from './config.ts'
```

```ts
/**
 * The theme's own assets, which no count would catch.
 *
 * The three fonts are not in the media library and not in any page's post
 * content, so `EXPECTED.media` stays satisfied whether they were archived or
 * not. They are the site's entire typography and are unrecoverable once
 * WordPress is off, so their absence is an error, never a warning.
 */
export function checkRequiredAssets(manifest: readonly MediaRecord[]): Problem[] {
  const downloaded = new Set(
    manifest.filter((m) => m.status === 'downloaded').map((m) => canonicalPath(m.localPath)),
  )
  return REQUIRED_ASSETS.filter((p) => !downloaded.has(canonicalPath(p))).map((p) => ({
    rule: 'required-asset-missing',
    detail: `${p} is required by the theme but was not archived`,
    severity: 'error' as const,
  }))
}
```

Then call it from `verifyArchive`, immediately after the `checkReferencedImages` call:

```ts
  // Rule 6: the theme's fonts, which no count protects.
  problems.push(...checkRequiredAssets(manifest))
```

- [ ] **Step 6: Run to verify every test passes**

Run: `pnpm test && pnpm typecheck`
Expected: PASS across all files

- [ ] **Step 7: Commit**

```bash
git add scraper/src/verify.ts scraper/src/verify.test.ts
git commit -m "feat(scraper): verify completeness, including the theme's fonts"
```

---

### Task 8: The inventory report

**Files:**
- Create (copy, then modify): `scraper/src/report.ts`

**Interfaces:**
- Consumes: `MediaRecord`.
- Produces: `writeReport(outDir: string): Promise<string>` — returns the path written.

No test file: `report.ts` has none in the anceu repo either, it is a pure formatter over data the other stages already assert, and Task 10 verifies its output by reading it.

- [ ] **Step 1: Copy `report.ts`**

```bash
cp ~/src/anceu-web-new/scraper/src/report.ts scraper/src/
```

- [ ] **Step 2: Retitle and rehost**

Change the heading and the two `anceu.com` mentions:

```ts
    '# Rural Hackers archive inventory',
```

```ts
    '### Already broken on ruralhackers.com',
```

```ts
      : `${brokenAtSource.length} file(s) are referenced by the live site but 404. These are`,
```

(the last line needs no change; the one above it does).

- [ ] **Step 3: Add a theme-assets section**

Phase 2 needs to find the fonts and the compiled stylesheet without reading the whole manifest. Insert before the `## Backup` block:

```ts
    '## Theme assets',
    '',
    '_Referenced only from a rendered page\'s inline `<style>`. Not in the media',
    'library, not in any post content — harvested from `pages-full/`._',
    '',
    ...manifest
      .filter((m) => /^uploads\/(fonts|siteground-optimizer-assets)\//.test(m.localPath))
      .map((m) => `- ${m.localPath} (${typeOf(m)}, ${m.bytes ?? 0} bytes)`),
    '',
    'The display face is licensed as "OffBit Trial". Phase 2 must buy the',
    'production licence or replace it before going live.',
    '',
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add scraper/src/report.ts
git commit -m "feat(scraper): inventory report with a theme-assets section"
```

---

### Task 9: The stage runner

**Files:**
- Create (copy, then modify): `scraper/src/cli.ts`

**Interfaces:**
- Consumes: every module built so far.
- Produces: a CLI invoked as `node scraper/src/cli.ts <stage>`, where `<stage>` is `all` or one of `discover content snapshot media markdown verify report checksums`.

**The stage order differs from the anceu repo, deliberately.** `snapshot` moves ahead of `media` because `media` now harvests from `pages-full/`, which `snapshot` writes. Dependencies allow it: `snapshot` needs only `discover`'s url list, and nothing in `snapshot` reads the media manifest.

```
discover -> content -> snapshot -> media -> markdown -> verify -> report -> checksums
```

- [ ] **Step 1: Copy `cli.ts`**

```bash
cp ~/src/anceu-web-new/scraper/src/cli.ts scraper/src/
```

- [ ] **Step 2: Feed the rendered pages into the media stage**

Change the `media` function so the harvest sees both sources. Import `readRenderedPages` alongside `downloadMedia`:

```ts
import { downloadMedia, readRenderedPages, type MediaRecord } from './media.ts'
```

```ts
async function media(): Promise<MediaRecord[]> {
  const items = await load<ArchivedItem[]>(state.items, 'content')
  // Two sources. Post content finds the images pages embed; the rendered pages
  // find the theme's own assets — the three fonts and the compiled stylesheet —
  // which are in no post content and in no media library listing.
  const rendered = await readRenderedPages(OUT)
  if (rendered.length === 0) {
    console.warn('  no pages-full/ yet — run the snapshot stage first or theme assets are skipped')
  }
  const manifest = await downloadMedia(createHttp(), OUT, [...items.map((i) => i.html), ...rendered])
  const harvested = manifest.filter((m) => m.source === 'harvested').length
  console.log(`media: ${manifest.length} records (${harvested} harvested outside the library)`)
  return manifest
}
```

- [ ] **Step 3: Reorder the stage list**

Change the `order` array so `snapshot` precedes `media`:

```ts
const order: (keyof typeof STAGES)[] = [
  'discover',
  'content',
  'snapshot',
  'media',
  'markdown',
  'verify',
  'report',
  'checksums',
]
```

Leave the `STAGES` object's key order alone — it is a lookup table, not a sequence.

- [ ] **Step 4: Verify the CLI rejects an unknown stage**

Run: `node scraper/src/cli.ts nonsense`
Expected: exit code 2, printing `unknown stage "nonsense". one of: all, discover, content, snapshot, media, markdown, verify, report, checksums`

- [ ] **Step 5: Verify the first stage runs against the live site**

Run: `pnpm archive:discover`
Expected: `discover: 22 urls`, and `archive/seo/sitemap-urls.json` plus `sitemap-urls.csv` exist.

If the count is not 22, the live site changed since 2026-08-04 — stop and reconcile against the spec's inventory before continuing.

- [ ] **Step 6: Typecheck and commit**

```bash
pnpm typecheck
git add scraper/src/cli.ts
git commit -m "feat(scraper): stage runner, snapshotting before media"
```

---

### Task 10: Run the archive, verify it, document it

**Files:**
- Create: `README.md`
- Create (generated, partially committed): `archive/**`

**Interfaces:**
- Consumes: the complete CLI.
- Produces: a verified archive on disk, and `archive/reports/{inventory.md,checksums.sha256}` in git.

- [ ] **Step 1: Install the browser playwright needs**

Run: `pnpm exec playwright install chromium`
Expected: chromium downloaded

- [ ] **Step 2: Run the whole archive**

Run: `pnpm archive`
Expected, in order:

```
discover: 22 urls
content: 18 items          (15 pages + 3 posts)
snapshot: 22 pages (22 captured, 0 already done, 0 failed)
media: 222+ records (4+ harvested outside the library)
markdown: 18 files
verify: archive is complete
report: archive/reports/inventory.md
checksums: N files, ~110 MB -> archive/reports/checksums.sha256
```

`media` must report at least 4 harvested records — the three fonts and the compiled stylesheet. Fewer means the Task 4 and Task 6 fixes are not taking effect.

Any stage that fails is resumable: fix the cause and re-run the same command.

- [ ] **Step 3: Confirm the fonts are really on disk**

Run:

```bash
ls -la archive/media/uploads/fonts/
file archive/media/uploads/fonts/*
```

Expected: three files, non-zero, identified as OpenType/TrueType. This is the failure mode the whole task exists to prevent, so check it by hand rather than trusting the log line.

- [ ] **Step 4: Confirm verify actually asserts something**

Temporarily move a font aside and re-run verify, to prove the rule fires:

```bash
mv archive/media/uploads/fonts/OffBitTrial-101.otf /tmp/
pnpm archive:verify   # expect: ERROR [media-missing] and a non-zero exit
mv /tmp/OffBitTrial-101.otf archive/media/uploads/fonts/
pnpm archive:verify   # expect: verify: archive is complete
```

A verifier that passes unconditionally is worse than none. Note that this exercises `media-missing`, which fires on the manifest entry; `required-asset-missing` fires when the entry is absent from the manifest altogether.

- [ ] **Step 5: Read the report**

Run: `cat archive/reports/inventory.md`

Confirm it lists 22 URLs, the media-by-type breakdown includes `font/otf` and `font/ttf`, and the theme-assets section names all three fonts plus the stylesheet.

- [ ] **Step 6: Write `README.md`**

```markdown
# ruralhackers-web

Port of [ruralhackers.com](https://ruralhackers.com) from WordPress to Astro.
Phase 1 archives the existing site; phase 2 rebuilds it from that archive with
English, Spanish and Galician.

## Archiving

```
pnpm install
pnpm exec playwright install chromium
pnpm archive
```

Stages run in order and each is resumable, so an interrupted run is continued by
re-running the same command. Individually:

```
pnpm archive:discover    # sitemaps -> 22 urls
pnpm archive:content     # 15 pages, 3 posts, taxonomies, Yoast metadata
pnpm archive:snapshot    # full page html + desktop/mobile screenshots
pnpm archive:media       # 218 library images + harvested theme assets, ~107 MB
pnpm archive:markdown    # rendered html -> markdown
pnpm archive:verify      # completeness assertions
pnpm archive:report      # archive/reports/inventory.md
pnpm archive:checksums   # sha256 of everything git does not hold
```

`snapshot` runs **before** `media`, unlike the anceu archive. The theme's three
fonts and its compiled stylesheet are referenced only from a rendered page's
inline `<style>`, so `media` harvests from `archive/pages-full/`.

`pnpm test` runs the unit tests, `pnpm typecheck` the types.

## What's in the archive

| Path | Contents |
| --- | --- |
| `archive/raw/` | Verbatim REST responses. The insurance policy — never edited. |
| `archive/html/` | Rendered block markup, showing how each page was composed. |
| `archive/content/` | Clean Markdown. The input to phase 2 and the text for translators. |
| `archive/media/` | 218 library images plus harvested theme assets, at their original upload paths, with `manifest.json`. |
| `archive/pages-full/` | Fully rendered pages as served. The only record of the WPForms contact form as rendered. |
| `archive/screenshots/` | Desktop and mobile full-page captures. The visual reference for phase 2. |
| `archive/seo/` | `url-inventory.csv` and per-item Yoast metadata. |
| `archive/reports/` | Inventory and `checksums.sha256`. |

Three representations of every content item is deliberate: `raw/` survives a
lossy transform, `html/` records structure the rebuild discards, `content/` is
what you actually author from.

## Important

**`archive/media/`, `archive/screenshots/` and `archive/pages-full/` are
gitignored for size and are the irreplaceable part of this repo.** Back them up
off this machine before WordPress is switched off. Everything else can be
regenerated only while the old site is still up.

`archive/reports/checksums.sha256` *is* committed, so a backup can be verified
years from now with `sha256sum -c` and nothing from this repo.

## Before starting phase 2

Read `docs/superpowers/specs/2026-08-04-ruralhackers-wordpress-to-astro-design.md`.
It records facts about the source site that are not guessable and that will
break the rebuild if ignored:

- **Slugs do not determine URLs.** The page slugged `home` is served at `/`. Use
  the `link` field, never the slug.
- **Trailing slashes are canonical.** Astro needs `trailingSlash: 'always'`.
- **English must stay at the root, unprefixed** (`prefixDefaultLocale: false`).
  All 22 existing URLs are English at the root.
- **Astro's i18n `fallback` must stay off**, or every English page gets a
  duplicate at `/es/` and `/gl/`.
- **`X-WP-Total` overreports media by 2.** Expected counts are enumerated.
- The display font is licensed as **OffBit Trial** — resolve before going live.
- The 2026 page is served at `/2025-2-2/` and is in no navigation.
```

- [ ] **Step 7: Run the full suite one last time**

Run: `pnpm test && pnpm typecheck`
Expected: PASS

- [ ] **Step 8: Commit the code and the versioned part of the archive**

```bash
git add README.md archive/ docs/
git status   # confirm archive/media, archive/screenshots, archive/pages-full are NOT staged
git commit -m "feat(scraper): archive ruralhackers.com

22 urls, 15 pages, 3 posts, 218 library images and 4 harvested theme assets.
The three fonts are archived only because uploadPathFromUrl now compares
hostname rather than origin and the media stage harvests from the rendered
pages — the theme references them over http:// from an inline <style>, and
they are in no media library listing."
```

- [ ] **Step 9: Back up the unversioned directories**

The archive is now the only copy of 107 MB of media that cannot be regenerated once Hostinger is switched off. Copy `archive/media/`, `archive/screenshots/` and `archive/pages-full/` somewhere off this machine, then verify:

```bash
cd archive && sha256sum -c reports/checksums.sha256
```

Expected: every line `OK`.

---

## Self-Review

**Spec coverage.** Every phase 1 requirement in the spec maps to a task:

| Spec requirement | Task |
| --- | --- |
| Copy and adapt the anceu scraper, do not extract a shared package | 1, 2, 4, 5, 7, 8, 9 |
| Seven resumable stages | 9 (eight, counting `checksums`, which anceu also has) |
| Enumerated counts `15/3/2/0/5/218` | 1 (config), 7 (verify) |
| `media: 218` not 220, with the reason in a comment | 1 |
| `link` authoritative, not slug | 5 |
| Archive layout: raw, html, content, media, pages-full, screenshots, seo, reports | 2, 4, 5, 8, 9 |
| Contact form recoverable for phase 2 | 2 (`snapshot`), 10 step 5. Also in `raw/pages/contact.json`: the 4 fields are in `content.rendered`, contrary to the spec's assumption that only the snapshot would hold them — both records now exist. |
| Media gitignored, backup warned about | 1 (gitignore), 10 (README, step 9) |
| Vitest unit tests mirroring anceu | every task |
| `verify` fails loudly on drift | 7, proven in 10 step 4 |
| Theme fonts archived | 3, 4, 6, 7 — a gap the spec did not anticipate |

**Placeholder scan.** No `TBD`, no "add error handling", no "similar to Task N". Every code step carries the code. Task 8 has no test file, stated with its reason rather than left implicit.

**Type consistency.** `ArchivedItem['kind']` is `'pages' | 'posts'` in Task 5 and nothing later references `'accommodations'`. `MediaRecord` is defined in Task 4 and used unchanged in Tasks 6, 7, 8. `readRenderedPages(outDir: string): Promise<string[]>` is declared in Task 6 and called with that signature in Task 9. `checkRequiredAssets(manifest: readonly MediaRecord[]): Problem[]` is consistent between Task 7's test and implementation. `EXPECTED`'s six keys match the six passed to `checkCounts` in Task 7 exactly.

**One correction to the spec.** The spec says the snapshot is "the only record" of the contact form's fields. That is wrong: the fields are present in `content.rendered` too, so `archive/raw/pages/contact.json` holds them as well. Recorded here rather than silently ignored; the snapshot is still worth having as the record of the form *as rendered*.
