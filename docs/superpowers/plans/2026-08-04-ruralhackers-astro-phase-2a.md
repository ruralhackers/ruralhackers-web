# Rural Hackers Astro Site — Phase 2a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Astro site at visual parity with today's ruralhackers.com, in English, with the i18n plumbing and language dropdown already working, deployable to Netlify.

**Architecture:** Content lives as MDX in locale-partitioned collections so an AI agent can author against a zod schema. Every `.astro` component stays thin; all decidable logic (URL mapping, locale availability, navigation) lives in pure modules under `src/lib/` that vitest tests directly. Design tokens are CSS custom properties transcribed from the archive, not re-derived.

**Tech Stack:** Astro 7.1.6, @astrojs/mdx 7.0.5, @astrojs/sitemap 3.7.3, sharp 0.35.3, bun (package manager + task runner), vitest 4.1.10. No SSR adapter — `output: 'static'` plus a `_redirects` file.

## Global Constraints

- **`trailingSlash: 'always'`** and `site: 'https://ruralhackers.com'`. Every existing URL ends in a slash.
- **`i18n.routing.prefixDefaultLocale: false`.** English stays at the root, unprefixed. All 22 indexed URLs are English at the root.
- **`i18n.fallback` must stay unset.** Setting it duplicates every English page at `/es/` and `/gl/` serving English text.
- **`locales: ['en', 'es', 'gl']`, `defaultLocale: 'en'`.**
- **Phase 2a populates `en/` fully, plus the home page in `es/` and `gl/`.** The design's rule is that the dropdown never leads to a 404, and its fallback for an untranslated page is that locale's home — so those two homes must exist in 2a or the rule is broken on day one. The remaining 17 items in `es/` and `gl/` are phase 2b.
- **`z` is imported from `astro/zod`**, not from a standalone `zod` dependency.
- **Content config lives at `src/content.config.ts`** — not the legacy `src/content/config.ts`.
- **The scraper stays on Node.** `pnpm test`/`pnpm typecheck` continue to run the phase 1 suite; the site uses bun. Two runtimes in one repo is deliberate.
- **Never edit `archive/`.** It is the source of truth phase 2 is validated against.
- **Do not reproduce WPForms honeypot fields.** In both forms `field_4` is the honeypot, with a label randomised per request.

## Design tokens, read from the archive on 2026-08-04

Transcribe these verbatim. They came from the live site's `global-styles-inline-css` and from computed styles in a real browser — do not re-derive them.

| Token | Value |
| --- | --- |
| `--color-base` | `#FFFFFF` |
| `--color-contrast` | `#111111` |
| `--color-accent-1` | `#e56529` (orange) |
| `--color-accent-4` | `#686868` (focus outline) |
| `--color-accent-5` | `#eeeeee` |
| `--font-body` | `Inter` |
| `--font-display` | `"OffBit Trial"` |
| `--size-small` | `0.875rem` |
| `--size-medium` | `clamp(1rem, 1rem + ((1vw - 0.2rem) * 0.196), 1.125rem)` |
| `--size-large` | `clamp(1.125rem, 1.125rem + ((1vw - 0.2rem) * 0.392), 1.375rem)` |
| `--size-x-large` | `clamp(1.75rem, 1.75rem + ((1vw - 0.2rem) * 0.392), 2rem)` |
| `--size-xx-large` | `clamp(2.15rem, 2.15rem + ((1vw - 0.2rem) * 1.333), 3rem)` |
| `--space-20` … `--space-40` | `10px`, `20px`, `30px` |
| `--space-50` | `clamp(30px, 5vw, 50px)` |
| `--space-60` | `clamp(30px, 7vw, 70px)` |
| `--space-70` | `clamp(50px, 7vw, 90px)` |
| `--space-80` | `clamp(70px, 10vw, 140px)` |
| `--content-size` | `645px` |
| `--wide-size` | `1340px` |

**accent-2 (`#4c1f7a` purple) and accent-3 (`#219b9d` teal) are deliberately absent.** They exist in the WordPress palette but nothing references them — no element style, no content class. WordPress emits `.has-accent-N-color` utilities for every palette entry whether used or not, which is the only place they appear. Approved for removal.

### Typography assignments, measured from computed styles

| Element | Family | Size | Weight | Line height |
| --- | --- | --- | --- | --- |
| `body` | Inter | `22px` | 400 | `1.4` |
| `h1` | **Inter** | `--size-xx-large` | 700 | `1.34` |
| `h2` | Inter | `--size-x-large` | 700 | `1.34` |
| `h3`–`h6` | **OffBit Trial** | `--size-large` / inherit | 400 | `1.34`, `letter-spacing: -0.1px` |

**`h1` renders in Inter, and that is deliberate.** The live CSS says
`h1 { font-family: var(--wp--preset--font-family--offbit) }` — a token that does
not exist, since the only families defined are `offbit-trial` and `inter`. The
`var()` fails, the declaration is invalid at computed-value time, and `h1`
inherits Inter from `body`. Verified in a real browser: `h1` computes to `Inter`,
`48px`, weight `700`.

The design's *intent* was clearly OffBit Trial — the rule above it sets
`h1,h2,h3,h4,h5,h6` to `offbit-trial`. **Reproducing the render, not the intent,
was explicitly approved**, because "keep 100% of the design" means nobody should
perceive a change. Leave a comment saying so, and note that switching to the
intent is a one-line change.

## File Structure

```
astro.config.mjs                  i18n, trailingSlash, mdx, sitemap, image config
src/content.config.ts             the four collections and their zod schemas
src/styles/tokens.css             the table above, verbatim
src/styles/base.css               element defaults: body, headings, links, buttons
src/assets/fonts/                 the 3 archived faces, copied from archive/media
src/assets/images/                only the images the site references

src/lib/i18n.ts                   LOCALES, localeLabel, availableLocales
src/lib/urls.ts                   REDIRECTS, oldToNew, entryPath
src/lib/nav.ts                    NAV, the header's structure
src/lib/seo.ts                    buildTitle, buildMeta from archived Yoast rows

src/layouts/BaseLayout.astro      html/head/body, skip link, header + footer slots
src/components/Head.astro         title, meta, canonical, hreflang, og
src/components/Header.astro       wordmark, nav, LanguageDropdown
src/components/LanguageDropdown.astro
src/components/Footer.astro       the 3 social links
src/components/blocks/            Section, Columns, Column, Prose, Image,
                                  Buttons, Quote, Cover, Gallery, Spacer
src/components/ContactForm.astro  Netlify Form, 3 fields
src/components/HackerDaysForm.astro  Netlify Form, 4 fields

src/content/pages/{en,es,gl}/     home, about, contact, privacy-policy, blog
src/content/programmes/{en,es,gl}/  6 entries
src/content/years/{en,es,gl}/     2023, 2024, 2025, 2026
src/content/posts/{en,es,gl}/     3 entries

src/pages/index.astro             the front page
src/pages/[...slug].astro         root-level pages and posts
src/pages/progress/index.astro    the Progress index the old nav never had
src/pages/progress/[year].astro
src/pages/blog/index.astro
src/pages/[locale]/...            the same tree, prefixed, for es and gl

public/_redirects                 the URL map
netlify.toml                      build command, publish dir, bun version

tests/urls.test.ts                URL map and parity against the archive
tests/i18n.test.ts                locale availability logic
tests/nav.test.ts                 navigation structure
tests/tokens.test.ts              tokens.css matches the archived values
tests/parity.test.ts              every archived URL resolves or redirects
```

Logic lives in `src/lib/` so vitest can test it without rendering. `.astro` files
stay thin enough to review by eye.

## Content model, mapped from the archive

15 pages and 3 posts, distributed across four collections. This mapping is
exhaustive — every archived item has a home:

| Collection | Entries | From `archive/content/` |
| --- | --- | --- |
| `pages` | `home`, `about`, `contact`, `privacy-policy`, `blog` | `pages/{home,about,contact,privacy-policy-2,blog}.md` |
| `programmes` | `hacker-days`, `creative-residencies`, `rural-digital-projects`, `sharing-knowledge-events`, `ruralwo`, `rural-hackers-residencies` | same slugs |
| `years` | `2023`, `2024`, `2025`, `2026` | `pages/{2023-2,2024-2,2025-2,2025-2-2}.md` |
| `posts` | 3 posts | `posts/*.md` |

5 + 6 + 4 = 15 pages, plus 3 posts. `blog` carries no body — WordPress renders
that index from a template — so its schema must not require one.

## URL map

Preserved exactly, 13 URLs:

```
/                                          /blog/
/about/                                    /the-delicate-charm-of-bloodwort-blooms/
/contact/                                  /the-story-of-sunflowers-and-their-little-visitors/
/hacker-days/                              /speakers-at-festival-creativa/
/creative-residencies/
/rural-digital-projects/
/sharing-knowledge-events/
/ruralwo/
/rural-hackers-residencies/
```

301 redirects, 9 of them:

| From | To |
| --- | --- |
| `/2023-2/` | `/progress/2023/` |
| `/2024-2/` | `/progress/2024/` |
| `/2025-2/` | `/progress/2025/` |
| `/2025-2-2/` | `/progress/2026/` |
| `/privacy-policy-2/` | `/privacy-policy/` |
| `/category/uncategorized/` | `/blog/` |
| `/category/uncategorized-en/` | `/blog/` |
| `/author/nacho/` | `/blog/` |
| `/author/agustinanceu-com/` | `/blog/` |

Plus `/en/*` → `/:splat` (301), and the new `/progress/` index.

Dropping the author archives also removes a public page whose byline is the
literal string `agustin@anceu.com`.

## Navigation, read from the archived header

```
Contact       -> /contact/
Progress      -> /progress/          (was a dead `#`)
  2023        -> /progress/2023/
  2024        -> /progress/2024/
  2025        -> /progress/2025/
  2026        -> /progress/2026/     (exists today but is in no nav)
Volunteering  -> https://drive.google.com/file/d/1CLBQpPOobUIOcbqR8wh7uMyHpMaJ0YEf/view  (external)
Residencies   -> /rural-hackers-residencies/
```

Footer, three external links: Instagram `instagram.com/ruralhackers`, YouTube
`youtube.com/@ruralhackers`, LinkedIn `linkedin.com/company/rural-hackers`.

---

### Task 1: Astro scaffold that builds

**Files:**
- Create: `astro.config.mjs`, `tsconfig.json` (site-scoped), `src/pages/index.astro`
- Modify: `package.json`, `.gitignore`
- Test: `tests/build.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a `bun run build` that emits `dist/index.html`. Scripts `dev`, `build`, `preview`, `test:site`.

- [ ] **Step 1: Add the site dependencies with bun**

```bash
bun add astro@7.1.6 @astrojs/mdx@7.0.5 @astrojs/sitemap@3.7.3 sharp@0.35.3
bun add -d vitest@4.1.10
```

Do not add `zod` — `z` comes from `astro/zod`. Do not add `@astrojs/netlify` — this
is a static build.

- [ ] **Step 2: Add site scripts to `package.json`**

Keep every existing `archive:*` and the Node-based `test`/`typecheck` untouched.
Append:

```json
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test:site": "vitest run --config vitest.site.config.ts"
```

- [ ] **Step 3: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://ruralhackers.com',
  // Every existing url ends in a slash and 301s to the slashed form today.
  trailingSlash: 'always',
  output: 'static',
  i18n: {
    locales: ['en', 'es', 'gl'],
    defaultLocale: 'en',
    routing: {
      // All 22 indexed urls are English at the root. An /en/ prefix would
      // discard the site's entire search equity.
      prefixDefaultLocale: false,
    },
    // `fallback` is deliberately unset. Setting it duplicates every English
    // page at /es/ and /gl/ serving English text — duplicate content.
  },
  integrations: [mdx(), sitemap()],
})
```

- [ ] **Step 4: Create `vitest.site.config.ts`**

The phase 1 suite and the site suite are separate: one runs on Node against the
scraper, the other on bun against `src/`.

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
})
```

- [ ] **Step 5: Create a placeholder front page**

```astro
---
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Rural Hackers</title></head>
  <body><h1>Rural Hackers</h1></body>
</html>
```

- [ ] **Step 6: Write the failing build test**

```ts
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'

describe('build output', () => {
  it('emits the front page at dist/index.html', () => {
    // `bun run build` must have run first; this asserts the artefact, which is
    // what Netlify publishes.
    expect(existsSync('dist/index.html')).toBe(true)
  })
})
```

- [ ] **Step 7: Run it to verify it fails**

Run: `bun run test:site`
Expected: FAIL — `dist/index.html` does not exist

- [ ] **Step 8: Build, then verify the test passes**

Run: `bun run build && bun run test:site`
Expected: build succeeds, test PASSES

This is also the empirical answer to whether `astro build` works under bun with
sharp. Sharp was already verified standalone: identical output to Node, 188 KB
AVIF / 153 KB WebP on a 15 MP source. If the build fails here, the fallback is
`node --run build` while keeping bun for installs — record which one was needed.

- [ ] **Step 9: Add build artefacts to `.gitignore`**

Append `dist/`, `.astro/` (already present) and `node_modules/` (already
present); add `.netlify/` if absent.

- [ ] **Step 10: Commit**

```bash
git add package.json bun.lock astro.config.mjs vitest.site.config.ts src tests .gitignore
git commit -m "feat(site): astro scaffold with i18n config and a building front page"
```

---

### Task 2: Design tokens and the archived fonts

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`
- Create: `src/assets/fonts/` (3 files copied from `archive/media/uploads/fonts/`)
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `src/styles/tokens.css` defining every custom property in the token
  table, and `src/styles/base.css` setting element defaults. Later tasks import
  both from `BaseLayout.astro`.

- [ ] **Step 1: Copy the three faces out of the archive**

```bash
mkdir -p src/assets/fonts
cp archive/media/uploads/fonts/Inter-VariableFont_opszwght.ttf \
   archive/media/uploads/fonts/OffBitTrial-101.otf \
   archive/media/uploads/fonts/OffBitTrial-101Bold.otf \
   src/assets/fonts/
```

These are committed, unlike `archive/media/`. They are 910 KB total and the site
cannot render without them.

- [ ] **Step 2: Write the failing token test**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('src/styles/tokens.css', 'utf8')

describe('tokens.css', () => {
  it('carries the five colours the live site actually uses', () => {
    expect(css).toContain('--color-base: #FFFFFF')
    expect(css).toContain('--color-contrast: #111111')
    expect(css).toContain('--color-accent-1: #e56529')
    expect(css).toContain('--color-accent-4: #686868')
    expect(css).toContain('--color-accent-5: #eeeeee')
  })

  it('omits the two palette entries nothing references', () => {
    // accent-2 #4c1f7a and accent-3 #219b9d exist in the wordpress palette but
    // no element style and no content class uses them. Approved for removal.
    expect(css).not.toContain('4c1f7a')
    expect(css).not.toContain('219b9d')
  })

  it('reproduces the fluid type scale verbatim', () => {
    expect(css).toContain('--size-small: 0.875rem')
    expect(css).toContain(
      '--size-medium: clamp(1rem, 1rem + ((1vw - 0.2rem) * 0.196), 1.125rem)',
    )
    expect(css).toContain(
      '--size-xx-large: clamp(2.15rem, 2.15rem + ((1vw - 0.2rem) * 1.333), 3rem)',
    )
  })

  it('reproduces the spacing scale, which is clamp-based above step 40', () => {
    expect(css).toContain('--space-30: 20px')
    expect(css).toContain('--space-50: clamp(30px, 5vw, 50px)')
    expect(css).toContain('--space-80: clamp(70px, 10vw, 140px)')
  })

  it('keeps the two layout widths the theme constrains to', () => {
    expect(css).toContain('--content-size: 645px')
    expect(css).toContain('--wide-size: 1340px')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `bun run test:site`
Expected: FAIL — cannot read `src/styles/tokens.css`

- [ ] **Step 4: Create `src/styles/tokens.css`**

```css
/*
 * Transcribed from ruralhackers.com's `global-styles-inline-css` on 2026-08-04,
 * and from computed styles read in a real browser. These are measurements, not
 * choices — do not "improve" them without measuring the old site again.
 *
 * accent-2 (#4c1f7a purple) and accent-3 (#219b9d teal) are absent on purpose:
 * they are in the wordpress palette but nothing references them.
 */
:root {
  --color-base: #FFFFFF;
  --color-contrast: #111111;
  --color-accent-1: #e56529;
  --color-accent-4: #686868;
  --color-accent-5: #eeeeee;

  --font-body: Inter, system-ui, sans-serif;
  --font-display: "OffBit Trial", var(--font-body);

  --size-small: 0.875rem;
  --size-medium: clamp(1rem, 1rem + ((1vw - 0.2rem) * 0.196), 1.125rem);
  --size-large: clamp(1.125rem, 1.125rem + ((1vw - 0.2rem) * 0.392), 1.375rem);
  --size-x-large: clamp(1.75rem, 1.75rem + ((1vw - 0.2rem) * 0.392), 2rem);
  --size-xx-large: clamp(2.15rem, 2.15rem + ((1vw - 0.2rem) * 1.333), 3rem);

  --space-20: 10px;
  --space-30: 20px;
  --space-40: 30px;
  --space-50: clamp(30px, 5vw, 50px);
  --space-60: clamp(30px, 7vw, 70px);
  --space-70: clamp(50px, 7vw, 90px);
  --space-80: clamp(70px, 10vw, 140px);

  --content-size: 645px;
  --wide-size: 1340px;
}
```

- [ ] **Step 5: Run to verify the token test passes**

Run: `bun run test:site`
Expected: PASS

- [ ] **Step 6: Create `src/styles/base.css`**

```css
@font-face {
  font-family: Inter;
  src: url('/src/assets/fonts/Inter-VariableFont_opszwght.ttf') format('truetype-variations');
  font-weight: 100 900;
  font-display: swap;
}
@font-face {
  font-family: "OffBit Trial";
  src: url('/src/assets/fonts/OffBitTrial-101.otf') format('opentype');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "OffBit Trial";
  src: url('/src/assets/fonts/OffBitTrial-101Bold.otf') format('opentype');
  font-weight: 700;
  font-display: swap;
}

body {
  margin: 0;
  background: var(--color-base);
  color: var(--color-contrast);
  font-family: var(--font-body);
  font-size: 22px;
  line-height: 1.4;
}

/*
 * h1 is Inter, not the display face, and that is on purpose.
 *
 * The live site sets `h1 { font-family: var(--wp--preset--font-family--offbit) }`
 * — a token that does not exist. The var() fails, the declaration is invalid at
 * computed-value time, and h1 inherits Inter from body. Verified in a browser:
 * Inter, 48px, weight 700.
 *
 * The intent was clearly OffBit Trial. Reproducing the render rather than the
 * intent was an explicit decision, so that nobody perceives a change on
 * migration. To adopt the intent instead, change this one declaration to
 * var(--font-display).
 */
h1 {
  font-family: var(--font-body);
  font-size: var(--size-xx-large);
  font-weight: 700;
  line-height: 1.34;
}

h2 {
  font-family: var(--font-body);
  font-size: var(--size-x-large);
  font-weight: 700;
  line-height: 1.34;
}

h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: -0.1px;
  line-height: 1.34;
}
h3 { font-size: var(--size-large); }
h4 { font-size: var(--size-medium); }

a { color: inherit; text-decoration: none; }
a:hover { text-decoration: underline; }

:where(button, .button):focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-accent-4);
  outline-offset: 2px;
}

img { max-width: 100%; height: auto; }
```

- [ ] **Step 7: Verify the build still succeeds**

Run: `bun run build && bun run test:site`
Expected: both PASS

- [ ] **Step 8: Commit**

```bash
git add src/styles src/assets/fonts tests/tokens.test.ts
git commit -m "feat(site): design tokens and fonts transcribed from the archive"
```

---

### Task 3: The URL map, tested against the archive

**Files:**
- Create: `src/lib/urls.ts`
- Test: `tests/urls.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `REDIRECTS: ReadonlyArray<{ from: string; to: string }>` — the 9 permanent redirects.
  - `PRESERVED: readonly string[]` — the 13 URLs that must not change.
  - `oldToNew(path: string): string | null` — the new location for an old path, or `null` when the path is preserved as-is.
  - `renderRedirects(): string` — the body of `public/_redirects`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { oldToNew, PRESERVED, REDIRECTS, renderRedirects } from '../src/lib/urls.ts'

describe('oldToNew', () => {
  it('moves the year pages under /progress/, fixing the slug collision', () => {
    // The page titled "2026" is served at /2025-2-2/ today.
    expect(oldToNew('/2025-2-2/')).toBe('/progress/2026/')
    expect(oldToNew('/2025-2/')).toBe('/progress/2025/')
    expect(oldToNew('/2024-2/')).toBe('/progress/2024/')
    expect(oldToNew('/2023-2/')).toBe('/progress/2023/')
  })

  it('drops the -2 suffix wordpress left on the privacy policy', () => {
    expect(oldToNew('/privacy-policy-2/')).toBe('/privacy-policy/')
  })

  it('sends the junk taxonomy and author archives to the blog', () => {
    expect(oldToNew('/category/uncategorized/')).toBe('/blog/')
    expect(oldToNew('/category/uncategorized-en/')).toBe('/blog/')
    expect(oldToNew('/author/nacho/')).toBe('/blog/')
    // This one also removes a page whose public byline is an email address.
    expect(oldToNew('/author/agustinanceu-com/')).toBe('/blog/')
  })

  it('returns null for a url that must not move', () => {
    expect(oldToNew('/')).toBeNull()
    expect(oldToNew('/hacker-days/')).toBeNull()
    expect(oldToNew('/about/')).toBeNull()
  })
})

describe('the url surface', () => {
  it('accounts for all 22 archived urls', () => {
    expect(PRESERVED.length + REDIRECTS.length).toBe(22)
    expect(PRESERVED).toHaveLength(13)
    expect(REDIRECTS).toHaveLength(9)
  })

  it('covers every url in the archived inventory', () => {
    const csv = readFileSync('archive/seo/sitemap-urls.csv', 'utf8')
    const paths = csv
      .trim()
      .split('\r\n')
      .slice(1)
      .map((line) => new URL(line.split(',')[0]!).pathname)
    const known = new Set<string>([...PRESERVED, ...REDIRECTS.map((r) => r.from)])
    const missing = paths.filter((p) => !known.has(p))
    expect(missing).toEqual([])
  })

  it('never redirects a preserved url', () => {
    const preserved = new Set(PRESERVED)
    expect(REDIRECTS.filter((r) => preserved.has(r.from))).toEqual([])
  })

  it('points every redirect at a slashed path', () => {
    expect(REDIRECTS.filter((r) => !r.to.endsWith('/'))).toEqual([])
  })
})

describe('renderRedirects', () => {
  it('emits netlify syntax with 301s', () => {
    const body = renderRedirects()
    expect(body).toContain('/2025-2-2/   /progress/2026/   301')
    expect(body).toContain('/author/nacho/   /blog/   301')
  })

  it('sends a guessed /en/ prefix back to the root', () => {
    // Astro generates no /en/ routes with prefixDefaultLocale: false.
    expect(renderRedirects()).toContain('/en/*   /:splat   301')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test:site`
Expected: FAIL — cannot resolve `../src/lib/urls.ts`

- [ ] **Step 3: Create `src/lib/urls.ts`**

```ts
/**
 * The url surface, enumerated. 22 urls were indexed on 2026-08-04: 13 keep their
 * address exactly, 9 move with a 301.
 *
 * Enumerated rather than derived, because the old slugs cannot be computed: the
 * page titled "2026" is served at `/2025-2-2/`, a wordpress slug collision.
 */
export const PRESERVED = [
  '/',
  '/about/',
  '/contact/',
  '/blog/',
  '/hacker-days/',
  '/creative-residencies/',
  '/rural-digital-projects/',
  '/sharing-knowledge-events/',
  '/ruralwo/',
  '/rural-hackers-residencies/',
  '/the-delicate-charm-of-bloodwort-blooms/',
  '/the-story-of-sunflowers-and-their-little-visitors/',
  '/speakers-at-festival-creativa/',
] as const

export const REDIRECTS = [
  { from: '/2023-2/', to: '/progress/2023/' },
  { from: '/2024-2/', to: '/progress/2024/' },
  { from: '/2025-2/', to: '/progress/2025/' },
  // Not a typo: the page titled "2026" really is served at /2025-2-2/.
  { from: '/2025-2-2/', to: '/progress/2026/' },
  { from: '/privacy-policy-2/', to: '/privacy-policy/' },
  // Two categories named "uncategorized" across three posts, and two author
  // archives, one of which publishes an email address as its byline.
  { from: '/category/uncategorized/', to: '/blog/' },
  { from: '/category/uncategorized-en/', to: '/blog/' },
  { from: '/author/nacho/', to: '/blog/' },
  { from: '/author/agustinanceu-com/', to: '/blog/' },
] as const satisfies ReadonlyArray<{ from: string; to: string }>

const BY_FROM = new Map(REDIRECTS.map((r) => [r.from, r.to]))

/** The new location of an old path, or null when the path does not move. */
export function oldToNew(path: string): string | null {
  return BY_FROM.get(path) ?? null
}

/**
 * The body of `public/_redirects`.
 *
 * The `/en/*` rule exists because Astro generates no `/en/` routes under
 * `prefixDefaultLocale: false`, so anyone guessing the prefix would 404.
 */
export function renderRedirects(): string {
  const lines = [
    '# Generated from src/lib/urls.ts — see tests/urls.test.ts',
    ...REDIRECTS.map((r) => `${r.from}   ${r.to}   301`),
    '',
    '# English lives at the root; a guessed /en/ prefix folds back onto it.',
    '/en/*   /:splat   301',
    '',
  ]
  return lines.join('\n')
}
```

- [ ] **Step 4: Run to verify every url test passes**

Run: `bun run test:site`
Expected: PASS. The inventory test proves no archived url was forgotten.

- [ ] **Step 5: Commit**

```bash
git add src/lib/urls.ts tests/urls.test.ts
git commit -m "feat(site): the url map, checked against the archived inventory"
```

---

### Task 4: Locale availability, which is what the dropdown needs

**Files:**
- Create: `src/lib/i18n.ts`
- Test: `tests/i18n.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `LOCALES: readonly ['en', 'es', 'gl']` and `type Locale = 'en' | 'es' | 'gl'`
  - `DEFAULT_LOCALE: 'en'`
  - `localeLabel(locale: Locale): string` — `'EN' | 'ES' | 'GL'`
  - `localePath(locale: Locale, path: string): string` — prefixes for non-default locales, leaves English at the root.
  - `dropdownTargets(current: Locale, path: string, existing: readonly Locale[]): Array<{ locale: Locale; label: string; href: string; isCurrent: boolean }>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LOCALE,
  dropdownTargets,
  localeLabel,
  localePath,
  LOCALES,
} from '../src/lib/i18n.ts'

describe('locales', () => {
  it('lists the three languages with english as default', () => {
    expect(LOCALES).toEqual(['en', 'es', 'gl'])
    expect(DEFAULT_LOCALE).toBe('en')
  })

  it('labels them for the dropdown', () => {
    expect(localeLabel('en')).toBe('EN')
    expect(localeLabel('es')).toBe('ES')
    expect(localeLabel('gl')).toBe('GL')
  })
})

describe('localePath', () => {
  it('leaves english unprefixed, because all indexed urls are at the root', () => {
    expect(localePath('en', '/hacker-days/')).toBe('/hacker-days/')
    expect(localePath('en', '/')).toBe('/')
  })

  it('prefixes the other two', () => {
    expect(localePath('es', '/hacker-days/')).toBe('/es/hacker-days/')
    expect(localePath('gl', '/hacker-days/')).toBe('/gl/hacker-days/')
  })

  it('keeps the root slashed when prefixing', () => {
    expect(localePath('es', '/')).toBe('/es/')
    expect(localePath('gl', '/')).toBe('/gl/')
  })
})

describe('dropdownTargets', () => {
  it('links straight to a translation that exists', () => {
    const t = dropdownTargets('en', '/hacker-days/', ['en', 'es'])
    expect(t.find((x) => x.locale === 'es')!.href).toBe('/es/hacker-days/')
  })

  it('falls back to the locale home when the translation is missing', () => {
    // Never a 404, and never english served under an /es/ url.
    const t = dropdownTargets('en', '/hacker-days/', ['en'])
    expect(t.find((x) => x.locale === 'es')!.href).toBe('/es/')
    expect(t.find((x) => x.locale === 'gl')!.href).toBe('/gl/')
  })

  it('always offers all three languages', () => {
    expect(dropdownTargets('en', '/about/', ['en'])).toHaveLength(3)
  })

  it('marks the current locale', () => {
    const t = dropdownTargets('es', '/es/about/', ['en', 'es'])
    expect(t.filter((x) => x.isCurrent).map((x) => x.locale)).toEqual(['es'])
  })

  it('treats a path already carrying a prefix as the unprefixed one', () => {
    const t = dropdownTargets('es', '/es/about/', ['en', 'es'])
    expect(t.find((x) => x.locale === 'en')!.href).toBe('/about/')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test:site`
Expected: FAIL — cannot resolve `../src/lib/i18n.ts`

- [ ] **Step 3: Create `src/lib/i18n.ts`**

```ts
export const LOCALES = ['en', 'es', 'gl'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

const LABELS: Readonly<Record<Locale, string>> = { en: 'EN', es: 'ES', gl: 'GL' }

export function localeLabel(locale: Locale): string {
  return LABELS[locale]
}

/** Strips a leading `/es/` or `/gl/` so paths can be compared across locales. */
function unprefixed(path: string): string {
  const m = /^\/(es|gl)(\/.*)?$/.exec(path)
  return m ? (m[2] ?? '/') : path
}

/**
 * English stays at the root — all 22 indexed urls live there and an /en/ prefix
 * would discard the site's search equity.
 */
export function localePath(locale: Locale, path: string): string {
  const base = unprefixed(path)
  if (locale === DEFAULT_LOCALE) return base
  return base === '/' ? `/${locale}/` : `/${locale}${base}`
}

/**
 * What the language dropdown renders.
 *
 * A locale whose translation does not exist yet links to that locale's home
 * rather than to a 404 — and never to English content under an /es/ url. Phase
 * 2a ships English only, so this is the common case, not an edge case.
 */
export function dropdownTargets(
  current: Locale,
  path: string,
  existing: readonly Locale[],
): Array<{ locale: Locale; label: string; href: string; isCurrent: boolean }> {
  const base = unprefixed(path)
  return LOCALES.map((locale) => ({
    locale,
    label: localeLabel(locale),
    href: existing.includes(locale) ? localePath(locale, base) : localePath(locale, '/'),
    isCurrent: locale === current,
  }))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test:site`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts tests/i18n.test.ts
git commit -m "feat(site): locale paths and dropdown targets"
```

---

### Task 5: Navigation structure

**Files:**
- Create: `src/lib/nav.ts`
- Test: `tests/nav.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type NavItem = { label: string; href: string; external?: true; children?: readonly NavItem[] }`
  - `NAV: readonly NavItem[]`
  - `SOCIAL: readonly { label: string; href: string }[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { NAV, SOCIAL } from '../src/lib/nav.ts'

const flat = (items = NAV): { label: string; href: string }[] =>
  items.flatMap((i) => [{ label: i.label, href: i.href }, ...flat(i.children ?? [])])

describe('NAV', () => {
  it('keeps the four top-level items the old header had', () => {
    expect(NAV.map((i) => i.label)).toEqual([
      'Contact',
      'Progress',
      'Volunteering',
      'Residencies',
    ])
  })

  it('gives Progress a real destination instead of the dead # it had', () => {
    const progress = NAV.find((i) => i.label === 'Progress')!
    expect(progress.href).toBe('/progress/')
  })

  it('includes 2026 under Progress, which the old nav omitted', () => {
    const years = NAV.find((i) => i.label === 'Progress')!.children!
    expect(years.map((y) => y.label)).toEqual(['2023', '2024', '2025', '2026'])
    expect(years.find((y) => y.label === '2026')!.href).toBe('/progress/2026/')
  })

  it('keeps Volunteering pointing off-site', () => {
    const v = NAV.find((i) => i.label === 'Volunteering')!
    expect(v.external).toBe(true)
    expect(v.href).toContain('drive.google.com')
  })

  it('uses internal slashed paths everywhere else', () => {
    const internal = flat().filter((i) => !i.href.startsWith('http'))
    expect(internal.filter((i) => !i.href.endsWith('/'))).toEqual([])
  })
})

describe('SOCIAL', () => {
  it('carries the three footer links', () => {
    expect(SOCIAL.map((s) => s.label)).toEqual(['Instagram', 'YouTube', 'LinkedIn'])
    expect(SOCIAL.every((s) => s.href.startsWith('https://'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test:site`
Expected: FAIL — cannot resolve `../src/lib/nav.ts`

- [ ] **Step 3: Create `src/lib/nav.ts`**

```ts
export type NavItem = {
  label: string
  href: string
  external?: true
  children?: readonly NavItem[]
}

/**
 * Read from the archived header on 2026-08-04, with two deliberate repairs.
 *
 * `Progress` was a dead `#` — it now points at a real index, which the years
 * collection makes free. And 2026 was missing: the page exists, served at
 * /2025-2-2/, but no navigation linked it. Generating this from content is what
 * stops that recurring.
 */
export const NAV: readonly NavItem[] = [
  { label: 'Contact', href: '/contact/' },
  {
    label: 'Progress',
    href: '/progress/',
    children: [
      { label: '2023', href: '/progress/2023/' },
      { label: '2024', href: '/progress/2024/' },
      { label: '2025', href: '/progress/2025/' },
      { label: '2026', href: '/progress/2026/' },
    ],
  },
  {
    label: 'Volunteering',
    href: 'https://drive.google.com/file/d/1CLBQpPOobUIOcbqR8wh7uMyHpMaJ0YEf/view',
    external: true,
  },
  { label: 'Residencies', href: '/rural-hackers-residencies/' },
]

export const SOCIAL: readonly { label: string; href: string }[] = [
  { label: 'Instagram', href: 'https://instagram.com/ruralhackers' },
  { label: 'YouTube', href: 'https://www.youtube.com/@ruralhackers' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/rural-hackers' },
]
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test:site`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav.ts tests/nav.test.ts
git commit -m "feat(site): navigation, with a real Progress index and 2026 linked"
```

---

### Task 6: Content collections and their schemas

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/{pages,programmes,years,posts}/{en,es,gl}/.gitkeep`
- Test: `tests/collections.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: four collections named `pages`, `programmes`, `years`, `posts`, each
  loaded by `glob` from `./src/content/<name>` with `**/*.mdx`, so an entry's `id`
  carries its locale directory (`en/about`). Later tasks query them with
  `getCollection` and split the id on `/`.

- [ ] **Step 1: Create the locale directories**

```bash
for c in pages programmes years posts; do
  for l in en es gl; do
    mkdir -p "src/content/$c/$l" && touch "src/content/$c/$l/.gitkeep"
  done
done
```

`es/` and `gl/` stay empty through phase 2a. They exist so the structure is right
from the start and phase 2b needs no migration.

- [ ] **Step 2: Write the failing schema test**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/content.config.ts', 'utf8')

describe('content.config.ts', () => {
  it('defines the four collections the archive maps onto', () => {
    for (const name of ['pages', 'programmes', 'years', 'posts']) {
      expect(src).toContain(`${name}:`)
    }
  })

  it('imports z from astro/zod rather than adding a zod dependency', () => {
    expect(src).toContain("from 'astro/zod'")
    expect(src).not.toMatch(/from ['"]zod['"]/)
  })

  it('loads mdx from locale-partitioned directories', () => {
    expect(src).toContain("pattern: '**/*.mdx'")
    expect(src).toContain("base: './src/content/pages'")
  })

  it('does not require a body, because the blog index has none', () => {
    // page_for_posts is rendered from a template; the page owns a url and a
    // title only. A required body would fail the build on a true fact.
    expect(src).toContain('bodyOptional')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `bun run test:site`
Expected: FAIL — cannot read `src/content.config.ts`

- [ ] **Step 4: Create `src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

/**
 * Every collection is loaded from a locale-partitioned directory, so an entry's
 * id is `<locale>/<slug>` — `en/about`, `es/about`. Existence of a file is how
 * the language dropdown knows a translation exists, which is why the locale is
 * a directory rather than a frontmatter field.
 */
const localeGlob = (dir: string) => glob({ pattern: '**/*.mdx', base: `./src/content/${dir}` })

/**
 * Shared by every collection. `title` is required because every archived item
 * has one; the SEO fields are optional because Yoast did not always fill them.
 *
 * `bodyOptional` marks the entries WordPress renders from a template. Only the
 * blog index uses it — that page owns a url and a title, and the theme generates
 * the list. Requiring prose there would fail the build over a fact about the
 * source site.
 */
const common = {
  title: z.string(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  /** The url this content had on WordPress, for the parity check. */
  legacyUrl: z.string().url().optional(),
  bodyOptional: z.boolean().default(false),
}

const pages = defineCollection({
  loader: localeGlob('pages'),
  schema: z.object({ ...common }),
})

const programmes = defineCollection({
  loader: localeGlob('programmes'),
  schema: z.object({
    ...common,
    /** Order in the homepage's "Stuff we do" listing. */
    order: z.number().int().positive(),
    summary: z.string().optional(),
  }),
})

const years = defineCollection({
  loader: localeGlob('years'),
  schema: z.object({
    ...common,
    /** The calendar year. Drives /progress/<year>/ and the nav ordering. */
    year: z.number().int().min(2023).max(2100),
  }),
})

const posts = defineCollection({
  loader: localeGlob('posts'),
  schema: z.object({
    ...common,
    date: z.coerce.date(),
    author: z.string().optional(),
  }),
})

export const collections = { pages, programmes, years, posts }
```

- [ ] **Step 5: Run to verify the schema test passes and the build still works**

Run: `bun run test:site && bun run build`
Expected: both PASS. The collections are empty, which is valid.

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts src/content tests/collections.test.ts
git commit -m "feat(site): content collections, partitioned by locale"
```

---

### Task 7: Layout shell, header, footer and the language dropdown

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/Head.astro`,
  `src/components/Header.astro`, `src/components/Footer.astro`,
  `src/components/LanguageDropdown.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/shell.test.ts`

**Interfaces:**
- Consumes: `NAV` and `SOCIAL` from `src/lib/nav.ts`; `dropdownTargets`,
  `localeLabel`, `type Locale` from `src/lib/i18n.ts`; both stylesheets.
- Produces: `BaseLayout.astro` accepting props
  `{ title: string; description?: string; locale?: Locale; path: string; availableLocales?: readonly Locale[] }`
  and rendering `<slot />` inside `<main>`.

- [ ] **Step 1: Create `src/components/Head.astro`**

```astro
---
import { localePath, LOCALES, type Locale } from '../lib/i18n.ts'

interface Props {
  title: string
  description?: string
  locale: Locale
  path: string
  availableLocales: readonly Locale[]
}
const { title, description, locale, path, availableLocales } = Astro.props
const canonical = new URL(localePath(locale, path), Astro.site).href
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
{description && <meta name="description" content={description} />}
<link rel="canonical" href={canonical} />
{/* hreflang only for locales that actually exist, so we never advertise a 404. */}
{availableLocales.map((l) => (
  <link rel="alternate" hreflang={l} href={new URL(localePath(l, path), Astro.site).href} />
))}
<meta property="og:title" content={title} />
{description && <meta property="og:description" content={description} />}
<meta property="og:url" content={canonical} />
<meta property="og:type" content="website" />
```

- [ ] **Step 2: Create `src/components/LanguageDropdown.astro`**

```astro
---
import { dropdownTargets, type Locale } from '../lib/i18n.ts'

interface Props {
  locale: Locale
  path: string
  availableLocales: readonly Locale[]
}
const { locale, path, availableLocales } = Astro.props
const targets = dropdownTargets(locale, path, availableLocales)
const current = targets.find((t) => t.isCurrent)!
---
{/*
  A <details> rather than JavaScript: it opens on click, closes on Escape, and
  is reachable by keyboard with no script at all.
*/}
<details class="lang">
  <summary aria-label="Change language">{current.label}</summary>
  <ul>
    {targets.map((t) => (
      <li>
        <a href={t.href} hreflang={t.locale} aria-current={t.isCurrent ? 'true' : undefined}>
          {t.label}
        </a>
      </li>
    ))}
  </ul>
</details>

<style>
  .lang { position: relative; }
  .lang summary {
    cursor: pointer;
    list-style: none;
    font-size: var(--size-small);
    padding: var(--space-20);
  }
  .lang summary::-webkit-details-marker { display: none; }
  .lang ul {
    position: absolute;
    right: 0;
    margin: 0;
    padding: var(--space-20);
    list-style: none;
    background: var(--color-base);
    border: 1px solid var(--color-accent-5);
    z-index: 10;
  }
  .lang a[aria-current='true'] { color: var(--color-accent-1); }
</style>
```

- [ ] **Step 3: Create `src/components/Header.astro`**

```astro
---
import { NAV } from '../lib/nav.ts'
import LanguageDropdown from './LanguageDropdown.astro'
import { localePath, type Locale } from '../lib/i18n.ts'

interface Props {
  locale: Locale
  path: string
  availableLocales: readonly Locale[]
}
const { locale, path, availableLocales } = Astro.props
const href = (h: string, external?: boolean) => (external ? h : localePath(locale, h))
---
<header>
  <a class="wordmark" href={localePath(locale, '/')}>Rural Hackers</a>
  <nav aria-label="Main">
    <ul>
      {NAV.map((item) => (
        <li>
          <a
            href={href(item.href, item.external)}
            {...(item.external ? { rel: 'noopener', target: '_blank' } : {})}
          >{item.label}</a>
          {item.children && (
            <ul>
              {item.children.map((child) => (
                <li><a href={href(child.href, child.external)}>{child.label}</a></li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  </nav>
  <LanguageDropdown locale={locale} path={path} availableLocales={availableLocales} />
</header>

<style>
  header {
    display: flex;
    align-items: center;
    gap: var(--space-40);
    max-width: var(--wide-size);
    margin: 0 auto;
    padding: var(--space-30) var(--space-40);
  }
  .wordmark { font-family: var(--font-display); margin-right: auto; }
  nav ul { display: flex; gap: var(--space-40); list-style: none; margin: 0; padding: 0; }
  nav ul ul { display: none; }
  nav li:hover > ul, nav li:focus-within > ul {
    display: block;
    position: absolute;
    background: var(--color-base);
    border: 1px solid var(--color-accent-5);
    padding: var(--space-20);
  }
  nav li { position: relative; }
</style>
```

- [ ] **Step 4: Create `src/components/Footer.astro`**

```astro
---
import { SOCIAL } from '../lib/nav.ts'
---
<footer>
  <p>Follow us in real life</p>
  <ul>
    {SOCIAL.map((s) => (
      <li><a href={s.href} rel="noopener me" target="_blank">{s.label}</a></li>
    ))}
  </ul>
</footer>

<style>
  footer {
    max-width: var(--wide-size);
    margin: 0 auto;
    padding: var(--space-70) var(--space-40);
  }
  footer ul { display: flex; gap: var(--space-40); list-style: none; padding: 0; }
</style>
```

- [ ] **Step 5: Create `src/layouts/BaseLayout.astro`**

```astro
---
import Head from '../components/Head.astro'
import Header from '../components/Header.astro'
import Footer from '../components/Footer.astro'
import { DEFAULT_LOCALE, type Locale } from '../lib/i18n.ts'
import '../styles/tokens.css'
import '../styles/base.css'

interface Props {
  title: string
  description?: string
  locale?: Locale
  path: string
  availableLocales?: readonly Locale[]
}
const {
  title,
  description,
  locale = DEFAULT_LOCALE,
  path,
  availableLocales = [DEFAULT_LOCALE],
} = Astro.props
---
<!doctype html>
<html lang={locale}>
  <head>
    <Head
      title={title}
      description={description}
      locale={locale}
      path={path}
      availableLocales={availableLocales}
    />
  </head>
  <body>
    <a class="skip" href="#main">Skip to content</a>
    <Header locale={locale} path={path} availableLocales={availableLocales} />
    <main id="main"><slot /></main>
    <Footer />
    <style>
      .skip {
        position: absolute;
        left: -9999px;
      }
      .skip:focus {
        left: var(--space-30);
        top: var(--space-30);
        background: var(--color-base);
        padding: var(--space-20);
      }
      main { max-width: var(--wide-size); margin: 0 auto; padding: 0 var(--space-40); }
    </style>
  </body>
</html>
```

- [ ] **Step 6: Rewrite `src/pages/index.astro` to use the layout**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro'
---
<BaseLayout title="Rural Hackers" path="/">
  <h1>Rural Hackers</h1>
</BaseLayout>
```

- [ ] **Step 7: Write the shell test against the built HTML**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')

describe('the built front page', () => {
  it('declares english on the html element', () => {
    expect(html).toContain('lang="en"')
  })

  it('renders the language dropdown with all three languages', () => {
    expect(html).toContain('Change language')
    for (const label of ['EN', 'ES', 'GL']) expect(html).toContain(`>${label}<`)
  })

  it('sends untranslated locales to their home rather than a 404', () => {
    // Phase 2a ships english only, so es and gl point at their roots.
    expect(html).toContain('href="/es/"')
    expect(html).toContain('href="/gl/"')
  })

  it('emits an hreflang for english', () => {
    expect(html).toContain('hreflang="en"')
  })

  it('gives Progress a real href and links 2026', () => {
    expect(html).toContain('href="/progress/"')
    expect(html).toContain('href="/progress/2026/"')
  })

  it('keeps Volunteering external', () => {
    expect(html).toContain('drive.google.com')
  })

  it('has a skip link and a main landmark', () => {
    expect(html).toContain('Skip to content')
    expect(html).toContain('id="main"')
  })

  it('sets a canonical at the site origin', () => {
    expect(html).toContain('rel="canonical" href="https://ruralhackers.com/"')
  })
})
```

- [ ] **Step 8: Build and run the test**

Run: `bun run build && bun run test:site`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/layouts src/components tests/shell.test.ts src/pages/index.astro
git commit -m "feat(site): layout shell, navigation and the language dropdown"
```

---

### Task 8: Block components

**Files:**
- Create: `src/components/blocks/{Section,Columns,Column,Prose,Figure,Buttons,Quote,Cover,Gallery,Spacer}.astro`
- Create: `src/components/blocks/index.ts`
- Test: `tests/blocks.test.ts`

**Interfaces:**
- Consumes: the tokens.
- Produces a barrel at `src/components/blocks/index.ts` re-exporting all ten, so
  MDX files import from one place. Props:
  - `Section`: `{ width?: 'content' | 'wide' | 'full'; background?: 'base' | 'accent-5' | 'accent-1' | 'contrast'; space?: 20|30|40|50|60|70|80 }`
  - `Columns`: `{ gap?: 20|30|40|50; align?: 'top' | 'center'; stackBelow?: number }`
  - `Column`: `{ width?: string }`
  - `Prose`: `{ font?: 'body' | 'display'; size?: 'small' | 'medium' | 'large' | 'x-large' | 'xx-large' }`
  - `Figure`: `{ src: ImageMetadata; alt: string; caption?: string; width?: number }`
  - `Buttons`, `Quote`, `Cover`, `Gallery`, `Spacer` as below.

The archived markup is 13 block types, all generic layout primitives — 416
paragraphs, 269 columns, 186 groups, 177 headings, 150 images, 128 columns
wrappers, then spacers, buttons, quotes, covers, separators, lists and one
gallery. These ten components cover all of it, and no `wp-block-*` class
survives.

- [ ] **Step 1: Create `Section.astro`**

```astro
---
interface Props {
  width?: 'content' | 'wide' | 'full'
  background?: 'base' | 'accent-5' | 'accent-1' | 'contrast'
  space?: 20 | 30 | 40 | 50 | 60 | 70 | 80
}
const { width = 'content', background = 'base', space = 60 } = Astro.props
---
<section
  class:list={['section', `w-${width}`, `bg-${background}`]}
  style={`--section-space: var(--space-${space})`}
>
  <div class="inner"><slot /></div>
</section>

<style>
  .section { padding-block: var(--section-space); }
  .inner { margin-inline: auto; padding-inline: var(--space-40); }
  .w-content .inner { max-width: var(--content-size); }
  .w-wide .inner { max-width: var(--wide-size); }
  .w-full .inner { max-width: none; padding-inline: 0; }
  .bg-base { background: var(--color-base); }
  .bg-accent-5 { background: var(--color-accent-5); }
  .bg-accent-1 { background: var(--color-accent-1); color: var(--color-base); }
  .bg-contrast { background: var(--color-contrast); color: var(--color-base); }
</style>
```

- [ ] **Step 2: Create `Columns.astro` and `Column.astro`**

`Columns.astro`:

```astro
---
interface Props {
  gap?: 20 | 30 | 40 | 50
  align?: 'top' | 'center'
  /** Viewport width in px below which columns stack. */
  stackBelow?: number
}
const { gap = 40, align = 'top', stackBelow = 782 } = Astro.props
---
<div
  class:list={['columns', `align-${align}`]}
  style={`--cols-gap: var(--space-${gap}); --stack-below: ${stackBelow}px`}
>
  <slot />
</div>

<style>
  .columns { display: flex; flex-wrap: wrap; gap: var(--cols-gap); }
  .align-top { align-items: flex-start; }
  .align-center { align-items: center; }
  /* 782px is wordpress's own stacking breakpoint, kept so layouts break where
     they break today. */
  @media (max-width: 781px) {
    .columns { flex-direction: column; }
  }
</style>
```

`Column.astro`:

```astro
---
interface Props {
  /** A flex-basis, e.g. "33.33%". Omit to share space equally. */
  width?: string
}
const { width } = Astro.props
---
<div class="column" style={width ? `flex-basis: ${width}; flex-grow: 0` : undefined}>
  <slot />
</div>

<style>
  .column { flex: 1 1 0; min-width: 0; }
</style>
```

- [ ] **Step 3: Create `Prose.astro`**

```astro
---
interface Props {
  font?: 'body' | 'display'
  size?: 'small' | 'medium' | 'large' | 'x-large' | 'xx-large'
}
const { font = 'body', size } = Astro.props
---
{/*
  Ten of the archived paragraphs explicitly opt into the display face, which is
  why `font` is a prop rather than always inheriting.
*/}
<div
  class="prose"
  style={[
    `--prose-font: var(--font-${font})`,
    size ? `--prose-size: var(--size-${size})` : '',
  ].filter(Boolean).join('; ')}
>
  <slot />
</div>

<style>
  .prose { font-family: var(--prose-font); font-size: var(--prose-size, inherit); }
  .prose :global(p) { margin-block: 0 var(--space-30); }
  .prose :global(ul) { padding-inline-start: var(--space-40); }
</style>
```

- [ ] **Step 4: Create `Figure.astro`**

```astro
---
import { Image } from 'astro:assets'

interface Props {
  src: ImageMetadata
  alt: string
  caption?: string
  width?: number
}
const { src, alt, caption, width } = Astro.props
---
{/*
  alt is required, not optional. 215 of the 225 archived images have no alt text
  and phase 2 is the moment that stops being free — the type forces a decision,
  and `alt=""` is a valid, deliberate answer for decoration.
*/}
<figure>
  <Image src={src} alt={alt} width={width} formats={['avif', 'webp']} />
  {caption && <figcaption>{caption}</figcaption>}
</figure>

<style>
  figure { margin: 0; }
  figcaption {
    font-size: var(--size-small);
    color: var(--color-accent-4);
    margin-top: var(--space-20);
  }
</style>
```

- [ ] **Step 5: Create the five remaining blocks**

`Buttons.astro`:

```astro
---
interface Props { align?: 'left' | 'center' | 'right' }
const { align = 'left' } = Astro.props
---
<div class="buttons" style={`--btn-justify: ${align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'}`}><slot /></div>
<style>
  .buttons { display: flex; gap: var(--space-30); justify-content: var(--btn-justify); flex-wrap: wrap; }
  .buttons :global(a) {
    font-family: var(--font-body);
    border: 2px solid currentColor;
    padding: var(--space-20) var(--space-30);
  }
  .buttons :global(a:hover) { background: var(--color-accent-1); color: var(--color-base); text-decoration: none; }
</style>
```

`Quote.astro`:

```astro
---
interface Props { cite?: string }
const { cite } = Astro.props
---
<blockquote>
  <slot />
  {cite && <cite>{cite}</cite>}
</blockquote>
<style>
  blockquote {
    margin: 0;
    padding-inline-start: var(--space-40);
    border-inline-start: 4px solid var(--color-accent-1);
    font-family: var(--font-display);
  }
  cite { display: block; font-size: var(--size-small); color: var(--color-accent-4); font-style: normal; }
</style>
```

`Cover.astro`:

```astro
---
import { Image } from 'astro:assets'

interface Props {
  src?: ImageMetadata
  alt?: string
  minHeight?: string
  /** 0–100. The archived covers darken their imagery to keep text legible. */
  overlay?: number
}
const { src, alt = '', minHeight = '60vh', overlay = 40 } = Astro.props
---
<div class="cover" style={`--cover-min: ${minHeight}; --cover-overlay: ${overlay / 100}`}>
  {src && <Image class="bg" src={src} alt={alt} formats={['avif', 'webp']} />}
  <div class="content"><slot /></div>
</div>

<style>
  .cover { position: relative; display: grid; place-items: center; min-height: var(--cover-min); overflow: hidden; }
  .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cover::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--color-contrast);
    opacity: var(--cover-overlay);
  }
  .content { position: relative; z-index: 1; color: var(--color-base); padding: var(--space-50); text-align: center; }
</style>
```

`Gallery.astro`:

```astro
---
interface Props { columns?: 2 | 3 | 4; gap?: 20 | 30 | 40 }
const { columns = 3, gap = 30 } = Astro.props
---
<div class="gallery" style={`--gal-cols: ${columns}; --gal-gap: var(--space-${gap})`}><slot /></div>
<style>
  .gallery { display: grid; grid-template-columns: repeat(var(--gal-cols), 1fr); gap: var(--gal-gap); }
  @media (max-width: 781px) { .gallery { grid-template-columns: repeat(2, 1fr); } }
</style>
```

`Spacer.astro`:

```astro
---
interface Props { size?: 20 | 30 | 40 | 50 | 60 | 70 | 80 }
const { size = 40 } = Astro.props
---
<div aria-hidden="true" style={`height: var(--space-${size})`}></div>
```

- [ ] **Step 6: Create the barrel `src/components/blocks/index.ts`**

```ts
export { default as Section } from './Section.astro'
export { default as Columns } from './Columns.astro'
export { default as Column } from './Column.astro'
export { default as Prose } from './Prose.astro'
export { default as Figure } from './Figure.astro'
export { default as Buttons } from './Buttons.astro'
export { default as Quote } from './Quote.astro'
export { default as Cover } from './Cover.astro'
export { default as Gallery } from './Gallery.astro'
export { default as Spacer } from './Spacer.astro'
```

- [ ] **Step 7: Write the block test**

```ts
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'

const dir = 'src/components/blocks'
const files = readdirSync(dir).filter((f) => f.endsWith('.astro'))

describe('block components', () => {
  it('provides the ten primitives the archived markup needs', () => {
    expect(files.sort()).toEqual([
      'Buttons.astro', 'Column.astro', 'Columns.astro', 'Cover.astro',
      'Figure.astro', 'Gallery.astro', 'Prose.astro', 'Quote.astro',
      'Section.astro', 'Spacer.astro',
    ])
  })

  it('reintroduces no wp-block class', () => {
    for (const f of files) {
      expect(readFileSync(`${dir}/${f}`, 'utf8')).not.toContain('wp-block')
    }
  })

  it('styles only through tokens, never raw hex', () => {
    for (const f of files) {
      const css = readFileSync(`${dir}/${f}`, 'utf8')
      // currentColor and transparent are fine; literal colours are not.
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
    }
  })

  it('requires alt text on Figure', () => {
    const src = readFileSync(`${dir}/Figure.astro`, 'utf8')
    expect(src).toContain('alt: string')
    expect(src).not.toContain('alt?: string')
  })

  it('exports every block from the barrel', () => {
    const barrel = readFileSync(`${dir}/index.ts`, 'utf8')
    for (const f of files) {
      expect(barrel).toContain(f.replace('.astro', ''))
    }
  })
})
```

- [ ] **Step 8: Run the tests and build**

Run: `bun run test:site && bun run build`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/components/blocks tests/blocks.test.ts
git commit -m "feat(site): the ten block primitives, with no wp-block class left"
```

---

### Task 9: The two forms

**Files:**
- Create: `src/components/ContactForm.astro`, `src/components/HackerDaysForm.astro`
- Test: `tests/forms.test.ts`

**Interfaces:**
- Consumes: the tokens.
- Produces two Netlify Forms. Field inventory, read from
  `archive/raw/pages/{contact,hacker-days}.json`:

| Form | Field | Type | Required |
| --- | --- | --- | --- |
| contact (was WPForms 526) | Name | text | yes |
| | Email | email | yes |
| | Comment or Message | textarea | no |
| hacker-days (was WPForms 716) | Name | text | yes |
| | Email | email | yes |
| | Why would you like to be part of Hacker Days 2025? | textarea | yes |
| | How would you like to contribute? | textarea | yes |

**`field_4` in both forms is a WPForms honeypot** whose label is randomised per
request — `Email Name Message` on one fetch, `to Hacker be` on the next. It is
not a real field and must not be reproduced. Netlify's own `netlify-honeypot`
replaces it.

The Hacker Days label says **2025** and it is now 2026. Reproduce it verbatim —
correcting site copy is not this task's call — and flag it to the site's owners.

- [ ] **Step 1: Write the failing form test**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const contact = readFileSync('src/components/ContactForm.astro', 'utf8')
const hackerDays = readFileSync('src/components/HackerDaysForm.astro', 'utf8')

describe('ContactForm', () => {
  it('is a netlify form with a honeypot and no javascript', () => {
    expect(contact).toContain('data-netlify="true"')
    expect(contact).toContain('data-netlify-honeypot')
    expect(contact).not.toContain('<script')
  })

  it('carries the three real fields from WPForms 526', () => {
    for (const n of ['name', 'email', 'message']) {
      expect(contact).toContain(`name="${n}"`)
    }
  })

  it('requires name and email but not the message', () => {
    expect(contact).toMatch(/name="name"[^>]*required/)
    expect(contact).toMatch(/name="email"[^>]*required/)
    expect(contact).not.toMatch(/name="message"[^>]*required/)
  })

  it('does not reproduce the wpforms honeypot label', () => {
    // field_4's label is randomised gibberish, different on every request.
    expect(contact).not.toContain('Email Name Message')
  })
})

describe('HackerDaysForm', () => {
  it('carries the four real fields from WPForms 716', () => {
    for (const n of ['name', 'email', 'motivation', 'contribution']) {
      expect(hackerDays).toContain(`name="${n}"`)
    }
  })

  it('requires all four, as the source form does', () => {
    for (const n of ['name', 'email', 'motivation', 'contribution']) {
      expect(hackerDays).toMatch(new RegExp(`name="${n}"[^>]*required`))
    }
  })

  it('reproduces the source label verbatim, including its stale year', () => {
    expect(hackerDays).toContain('Why would you like to be part of Hacker Days 2025?')
  })

  it('does not reproduce the wpforms honeypot label', () => {
    expect(hackerDays).not.toContain('to Hacker be')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test:site`
Expected: FAIL — neither component file exists

- [ ] **Step 3: Create `src/components/ContactForm.astro`**

```astro
---
/**
 * Replaces WPForms 526. Three real fields; WPForms' fourth was a honeypot with a
 * per-request randomised label, which Netlify's own honeypot supersedes.
 */
---
<form name="contact" method="POST" data-netlify="true" data-netlify-honeypot="bot-field">
  <input type="hidden" name="form-name" value="contact" />
  <p class="hidden">
    <label>Do not fill this in <input name="bot-field" /></label>
  </p>

  <p>
    <label for="contact-name">Name</label>
    <input id="contact-name" type="text" name="name" required />
  </p>
  <p>
    <label for="contact-email">Email</label>
    <input id="contact-email" type="email" name="email" required />
  </p>
  <p>
    <label for="contact-message">Comment or Message</label>
    <textarea id="contact-message" name="message" rows="6"></textarea>
  </p>
  <p><button type="submit">Submit</button></p>
</form>

<style>
  form { display: grid; gap: var(--space-30); max-width: var(--content-size); }
  form p { margin: 0; display: grid; gap: var(--space-20); }
  .hidden { position: absolute; left: -9999px; }
  input, textarea {
    font: inherit;
    font-size: var(--size-medium);
    padding: var(--space-20);
    border: 2px solid var(--color-accent-5);
    background: var(--color-base);
    color: var(--color-contrast);
  }
  button {
    font-family: var(--font-body);
    border: 2px solid currentColor;
    background: none;
    padding: var(--space-20) var(--space-40);
    cursor: pointer;
  }
  button:hover { background: var(--color-accent-1); color: var(--color-base); }
</style>
```

- [ ] **Step 4: Create `src/components/HackerDaysForm.astro`**

```astro
---
/**
 * Replaces WPForms 716. Four real fields, all required; WPForms' field_4 was a
 * honeypot with a per-request randomised label.
 *
 * The motivation label says "Hacker Days 2025" on the live site and it is now
 * 2026. Reproduced verbatim on purpose — correcting site copy is the owners'
 * call, not the port's. Flagged for them.
 */
---
<form name="hacker-days" method="POST" data-netlify="true" data-netlify-honeypot="bot-field">
  <input type="hidden" name="form-name" value="hacker-days" />
  <p class="hidden">
    <label>Do not fill this in <input name="bot-field" /></label>
  </p>

  <p>
    <label for="hd-name">Name</label>
    <input id="hd-name" type="text" name="name" required />
  </p>
  <p>
    <label for="hd-email">Email</label>
    <input id="hd-email" type="email" name="email" required />
  </p>
  <p>
    <label for="hd-motivation">Why would you like to be part of Hacker Days 2025?</label>
    <textarea id="hd-motivation" name="motivation" rows="5" required></textarea>
  </p>
  <p>
    <label for="hd-contribution">How would you like to contribute?</label>
    <textarea id="hd-contribution" name="contribution" rows="5" required></textarea>
  </p>
  <p><button type="submit">Submit</button></p>
</form>

<style>
  form { display: grid; gap: var(--space-30); max-width: var(--content-size); }
  form p { margin: 0; display: grid; gap: var(--space-20); }
  .hidden { position: absolute; left: -9999px; }
  input, textarea {
    font: inherit;
    font-size: var(--size-medium);
    padding: var(--space-20);
    border: 2px solid var(--color-accent-5);
    background: var(--color-base);
    color: var(--color-contrast);
  }
  button {
    font-family: var(--font-body);
    border: 2px solid currentColor;
    background: none;
    padding: var(--space-20) var(--space-40);
    cursor: pointer;
  }
  button:hover { background: var(--color-accent-1); color: var(--color-base); }
</style>
```

- [ ] **Step 5: Run to verify the form tests pass**

Run: `bun run test:site`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ContactForm.astro src/components/HackerDaysForm.astro tests/forms.test.ts
git commit -m "feat(site): both contact forms as netlify forms, honeypots dropped"
```

---

### Task 10: Port the English content and route it

**Files:**
- Create: `src/content/pages/en/*.mdx` (5), `src/content/programmes/en/*.mdx` (6),
  `src/content/years/en/*.mdx` (4), `src/content/posts/en/*.mdx` (3)
- Create: `src/pages/[...slug].astro`, `src/pages/progress/index.astro`,
  `src/pages/progress/[year].astro`, `src/pages/blog/index.astro`
- Modify: `src/pages/index.astro`
- Create: `src/lib/entries.ts`
- Test: `tests/entries.test.ts`

**Interfaces:**
- Consumes: the collections, the blocks barrel, `BaseLayout`, both forms.
- Produces:
  - `src/lib/entries.ts`: `splitId(id: string): { locale: Locale; slug: string }`,
    `localesFor(ids: readonly string[], slug: string): Locale[]`,
    `pathFor(collection: 'pages' | 'programmes' | 'years' | 'posts', slug: string): string`

**Method for each of the 18 items.** This is iterative work with a fixed
acceptance check, not a single mechanical transform:

1. Read `archive/content/<kind>/<slug>.md` for the prose and
   `archive/html/<kind>/<slug>.html` for the structure it was composed with.
2. Write `src/content/<collection>/en/<slug>.mdx` with frontmatter from the
   archived `seoTitle`/`seoDescription`/`url`, composing the body from the blocks
   barrel.
3. Copy the images that entry references from `archive/media/uploads/...` into
   `src/assets/images/`, and give every one real alt text — 215 of 225 have none
   today, and `Figure` will not compile without it.
4. Compare the rendered page against `archive/screenshots/<slug>.desktop.png` and
   `.mobile.png` at 1440×900 and 390×844.

- [ ] **Step 1: Write the failing entries test**

```ts
import { describe, it, expect } from 'vitest'
import { localesFor, pathFor, splitId } from '../src/lib/entries.ts'

describe('splitId', () => {
  it('reads the locale out of the entry id', () => {
    expect(splitId('en/about')).toEqual({ locale: 'en', slug: 'about' })
    expect(splitId('gl/hacker-days')).toEqual({ locale: 'gl', slug: 'hacker-days' })
  })

  it('treats a bare id as the default locale', () => {
    expect(splitId('about')).toEqual({ locale: 'en', slug: 'about' })
  })
})

describe('localesFor', () => {
  it('finds which languages an entry exists in', () => {
    expect(localesFor(['en/about', 'es/about', 'en/contact'], 'about')).toEqual(['en', 'es'])
  })

  it('returns just english when nothing is translated yet', () => {
    expect(localesFor(['en/about'], 'about')).toEqual(['en'])
  })

  it('keeps locale order stable for the dropdown', () => {
    expect(localesFor(['gl/x', 'en/x', 'es/x'], 'x')).toEqual(['en', 'es', 'gl'])
  })
})

describe('pathFor', () => {
  it('serves the front page at the root, not at its slug', () => {
    // The wordpress page slugged `home` was served at "/". Keep it there.
    expect(pathFor('pages', 'home')).toBe('/')
  })

  it('keeps the other pages and every programme at the root level', () => {
    expect(pathFor('pages', 'about')).toBe('/about/')
    expect(pathFor('programmes', 'hacker-days')).toBe('/hacker-days/')
  })

  it('moves the years under /progress/', () => {
    expect(pathFor('years', '2026')).toBe('/progress/2026/')
  })

  it('keeps posts at the root, where they are indexed', () => {
    expect(pathFor('posts', 'speakers-at-festival-creativa')).toBe(
      '/speakers-at-festival-creativa/',
    )
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test:site`
Expected: FAIL — cannot resolve `../src/lib/entries.ts`

- [ ] **Step 3: Create `src/lib/entries.ts`**

```ts
import { DEFAULT_LOCALE, LOCALES, type Locale } from './i18n.ts'

const isLocale = (v: string): v is Locale => (LOCALES as readonly string[]).includes(v)

/** Entry ids are `<locale>/<slug>`, because the loader globs locale directories. */
export function splitId(id: string): { locale: Locale; slug: string } {
  const [head, ...rest] = id.split('/')
  if (head && isLocale(head) && rest.length > 0) {
    return { locale: head, slug: rest.join('/') }
  }
  return { locale: DEFAULT_LOCALE, slug: id }
}

/**
 * Which languages a given slug exists in, in `LOCALES` order so the dropdown
 * never reorders itself between pages.
 */
export function localesFor(ids: readonly string[], slug: string): Locale[] {
  const found = new Set(
    ids.map(splitId).filter((x) => x.slug === slug).map((x) => x.locale),
  )
  return LOCALES.filter((l) => found.has(l))
}

/**
 * The unprefixed path an entry is served at.
 *
 * `home` maps to "/" because that is where WordPress served it — the slug never
 * determined the url. Years move under /progress/, which is also what turns the
 * old dead `#` nav item into a real destination.
 */
export function pathFor(
  collection: 'pages' | 'programmes' | 'years' | 'posts',
  slug: string,
): string {
  if (collection === 'years') return `/progress/${slug}/`
  if (collection === 'pages' && slug === 'home') return '/'
  return `/${slug}/`
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test:site`
Expected: PASS

- [ ] **Step 5: Commit the routing helpers**

```bash
git add src/lib/entries.ts tests/entries.test.ts
git commit -m "feat(site): entry id and path helpers"
```

- [ ] **Step 6: Write `src/pages/[...slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content'
import BaseLayout from '../layouts/BaseLayout.astro'
import { localesFor, pathFor, splitId } from '../lib/entries.ts'
import { DEFAULT_LOCALE } from '../lib/i18n.ts'

export async function getStaticPaths() {
  const kinds = ['pages', 'programmes', 'posts'] as const
  const paths = []
  for (const kind of kinds) {
    const all = await getCollection(kind)
    const ids = all.map((e) => e.id)
    for (const entry of all) {
      const { locale, slug } = splitId(entry.id)
      if (locale !== DEFAULT_LOCALE) continue
      const path = pathFor(kind, slug)
      // The front page has its own route, so it is excluded here.
      if (path === '/') continue
      paths.push({
        params: { slug: path.replace(/^\/|\/$/g, '') },
        props: { entry, path, availableLocales: localesFor(ids, slug) },
      })
    }
  }
  return paths
}

const { entry, path, availableLocales } = Astro.props
const { Content } = await render(entry)
---
<BaseLayout
  title={entry.data.seoTitle ?? entry.data.title}
  description={entry.data.seoDescription}
  path={path}
  availableLocales={availableLocales}
>
  <Content />
</BaseLayout>
```

- [ ] **Step 7: Write the three index routes**

`src/pages/progress/index.astro`:

```astro
---
import { getCollection } from 'astro:content'
import BaseLayout from '../../layouts/BaseLayout.astro'
import { Section, Columns, Column } from '../../components/blocks/index.ts'
import { splitId } from '../../lib/entries.ts'
import { DEFAULT_LOCALE } from '../../lib/i18n.ts'

// The old nav pointed "Progress" at a dead `#`. The years collection makes a
// real index free, which is also how 2026 stops being unreachable.
const years = (await getCollection('years'))
  .filter((e) => splitId(e.id).locale === DEFAULT_LOCALE)
  .sort((a, b) => b.data.year - a.data.year)
---
<BaseLayout title="Progress" path="/progress/">
  <Section width="wide">
    <h1>Progress</h1>
    <Columns>
      {years.map((y) => (
        <Column>
          <h2><a href={`/progress/${y.data.year}/`}>{y.data.year}</a></h2>
          {y.data.seoDescription && <p>{y.data.seoDescription}</p>}
        </Column>
      ))}
    </Columns>
  </Section>
</BaseLayout>
```

`src/pages/progress/[year].astro`:

```astro
---
import { getCollection, render } from 'astro:content'
import BaseLayout from '../../layouts/BaseLayout.astro'
import { localesFor, splitId } from '../../lib/entries.ts'
import { DEFAULT_LOCALE } from '../../lib/i18n.ts'

export async function getStaticPaths() {
  const all = await getCollection('years')
  const ids = all.map((e) => e.id)
  return all
    .filter((e) => splitId(e.id).locale === DEFAULT_LOCALE)
    .map((entry) => {
      const { slug } = splitId(entry.id)
      return {
        params: { year: String(entry.data.year) },
        props: {
          entry,
          path: `/progress/${entry.data.year}/`,
          availableLocales: localesFor(ids, slug),
        },
      }
    })
}

const { entry, path, availableLocales } = Astro.props
const { Content } = await render(entry)
---
<BaseLayout
  title={entry.data.seoTitle ?? entry.data.title}
  description={entry.data.seoDescription}
  path={path}
  availableLocales={availableLocales}
>
  <Content />
</BaseLayout>
```

`src/pages/blog/index.astro`:

```astro
---
import { getCollection } from 'astro:content'
import BaseLayout from '../../layouts/BaseLayout.astro'
import { Section } from '../../components/blocks/index.ts'
import { pathFor, splitId } from '../../lib/entries.ts'
import { DEFAULT_LOCALE } from '../../lib/i18n.ts'

// The blog page owns a url and a title; wordpress generated this list from a
// template, which is why its entry has no body.
const posts = (await getCollection('posts'))
  .filter((e) => splitId(e.id).locale === DEFAULT_LOCALE)
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
---
<BaseLayout title="Blog" path="/blog/">
  <Section>
    <h1>Blog</h1>
    <ul>
      {posts.map((p) => {
        const { slug } = splitId(p.id)
        return (
          <li>
            <a href={pathFor('posts', slug)}>{p.data.title}</a>
            <time datetime={p.data.date.toISOString()}>
              {p.data.date.toISOString().slice(0, 10)}
            </time>
          </li>
        )
      })}
    </ul>
  </Section>
</BaseLayout>
```

- [ ] **Step 8: Port the front page**

Read `archive/content/pages/home.md` and `archive/html/pages/home.html`. The
homepage's section sequence, from the archived headings, is: hero wordmark, "The
Context", "This is our motto", "Stuff we do", "Our hackers", the villagers
paragraph, "We are proud of our partners", "Follow us in real life".

Write `src/content/pages/en/home.mdx` composing those with the blocks, then
reduce `src/pages/index.astro` to:

```astro
---
import { getCollection, getEntry, render } from 'astro:content'
import BaseLayout from '../layouts/BaseLayout.astro'
import { localesFor } from '../lib/entries.ts'

const entry = await getEntry('pages', 'en/home')
if (!entry) throw new Error('src/content/pages/en/home.mdx is missing')
const ids = (await getCollection('pages')).map((e) => e.id)
const { Content } = await render(entry)
---
<BaseLayout
  title={entry.data.seoTitle ?? entry.data.title}
  description={entry.data.seoDescription}
  path="/"
  availableLocales={localesFor(ids, 'home')}
>
  <Content />
</BaseLayout>
```

- [ ] **Step 9: Port the remaining 17 items**

Work through them in this order, applying the four-step method above to each.
Commit after each group so a reviewer can reject one without losing the others:

1. `pages`: `about`, `contact` (embeds `ContactForm`), `privacy-policy` (from
   `privacy-policy-2.md`), `blog` (frontmatter only, `bodyOptional: true`)
2. `programmes`: `hacker-days` (embeds `HackerDaysForm`),
   `creative-residencies`, `rural-digital-projects`,
   `sharing-knowledge-events`, `ruralwo`, `rural-hackers-residencies`
3. `years`: `2023`, `2024`, `2025`, `2026` (the last from `2025-2-2.md`)
4. `posts`: the three, with `date` from the archived frontmatter

- [ ] **Step 10: Build and verify every route exists**

Run: `bun run build && find dist -name '*.html' | sort`
Expected: 18 content pages plus `/progress/` — 19 HTML files, each at the path
`pathFor` gives it.

- [ ] **Step 11: Commit**

```bash
git add src/content src/pages src/assets/images
git commit -m "feat(site): port the english content and its routes"
```

---

### Task 11: Redirects, deploy config, and URL parity

**Files:**
- Create: `public/_redirects`, `netlify.toml`, `scripts/write-redirects.ts`
- Test: `tests/parity.test.ts`

**Interfaces:**
- Consumes: `renderRedirects` from `src/lib/urls.ts`; the built `dist/`.
- Produces: `public/_redirects` generated from the single source of truth, a
  Netlify build config, and the check that no archived URL 404s.

- [ ] **Step 1: Create the generator `scripts/write-redirects.ts`**

```ts
/**
 * Writes public/_redirects from src/lib/urls.ts.
 *
 * Generated rather than hand-maintained so the redirect table and the tests that
 * check it cannot drift apart.
 */
import { writeFileSync } from 'node:fs'
import { renderRedirects } from '../src/lib/urls.ts'

writeFileSync('public/_redirects', renderRedirects(), 'utf8')
console.log('wrote public/_redirects')
```

- [ ] **Step 2: Wire it into the build**

In `package.json`, change the site build so redirects are always regenerated:

```json
    "build": "bun scripts/write-redirects.ts && astro build",
```

- [ ] **Step 3: Create `netlify.toml`**

```toml
# Static build. No SSR adapter, so no @astrojs/netlify.
[build]
  command = "bun run build"
  publish = "dist"

[build.environment]
  BUN_VERSION = "1.3.14"

# Astro emits fingerprinted assets under _astro, which are safe to cache hard.
[[headers]]
  for = "/_astro/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

- [ ] **Step 4: Write the failing parity test**

```ts
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { PRESERVED, REDIRECTS } from '../src/lib/urls.ts'

/** Where a built page for this path would live in dist/. */
const distFile = (path: string) =>
  path === '/' ? 'dist/index.html' : `dist${path}index.html`

describe('url parity with the archive', () => {
  it('built a page for every preserved url', () => {
    const missing = PRESERVED.filter((p) => !existsSync(distFile(p)))
    expect(missing).toEqual([])
  })

  it('wrote a redirect rule for every moved url', () => {
    const rules = readFileSync('public/_redirects', 'utf8')
    const missing = REDIRECTS.filter((r) => !rules.includes(`${r.from}   ${r.to}   301`))
    expect(missing).toEqual([])
  })

  it('built the destination of every redirect', () => {
    const targets = [...new Set(REDIRECTS.map((r) => r.to))]
    expect(targets.filter((t) => !existsSync(distFile(t)))).toEqual([])
  })

  it('leaves no url from the archived sitemap unaccounted for', () => {
    const csv = readFileSync('archive/seo/sitemap-urls.csv', 'utf8')
    const paths = csv.trim().split('\r\n').slice(1)
      .map((l) => new URL(l.split(',')[0]!).pathname)
    const rules = readFileSync('public/_redirects', 'utf8')
    const orphans = paths.filter(
      (p) => !existsSync(distFile(p)) && !rules.includes(`${p}   `),
    )
    expect(orphans).toEqual([])
  })

  it('built the new progress index', () => {
    expect(existsSync('dist/progress/index.html')).toBe(true)
  })

  it('registers both netlify forms in the built html', () => {
    const contact = readFileSync('dist/contact/index.html', 'utf8')
    const hd = readFileSync('dist/hacker-days/index.html', 'utf8')
    expect(contact).toContain('name="contact"')
    expect(hd).toContain('name="hacker-days"')
  })
})
```

- [ ] **Step 5: Run it to verify it fails**

Run: `bun run test:site`
Expected: FAIL — `public/_redirects` does not exist yet

- [ ] **Step 6: Build and re-run**

Run: `bun run build && bun run test:site`
Expected: PASS. This is the test that proves no URL was lost in the port.

- [ ] **Step 7: Commit**

```bash
git add public/_redirects netlify.toml scripts/write-redirects.ts tests/parity.test.ts package.json
git commit -m "feat(site): redirects, netlify config and the url parity check"
```

---

### Task 12: Visual comparison and the README

**Files:**
- Create: `scripts/compare-screenshots.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: the built site, `archive/screenshots/`.
- Produces: side-by-side captures under `.compare/` for eyeball review, and
  README instructions for the site.

- [ ] **Step 1: Create the comparison script**

```ts
/**
 * Captures the built site at the archive's two viewports so each page can be
 * put beside its archived screenshot.
 *
 * Deliberately not a pixel-diff assertion: the port reproduces the design, not
 * the markup, so exact pixels will differ and a threshold would either pass
 * everything or fail everything. A human comparing 22 pairs is the check.
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { PRESERVED, REDIRECTS } from '../src/lib/urls.ts'

const BASE = process.env.PREVIEW_URL ?? 'http://localhost:4321'
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }

const paths = [...PRESERVED, ...REDIRECTS.map((r) => r.to)]
const seen = new Set<string>()

await mkdir('.compare', { recursive: true })
const browser = await chromium.launch()
for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport })
  for (const path of paths) {
    if (seen.has(`${name}${path}`)) continue
    seen.add(`${name}${path}`)
    const page = await ctx.newPage()
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 30_000 })
      await page.waitForTimeout(500)
      const slug = path === '/' ? 'index' : path.replace(/^\/|\/$/g, '').replace(/\//g, '-')
      await page.screenshot({ path: `.compare/${slug}.${name}.png`, fullPage: true })
    } catch (e) {
      console.warn(`  failed ${path}: ${e instanceof Error ? e.message.split('\n')[0] : e}`)
    } finally {
      await page.close()
    }
  }
  await ctx.close()
}
await browser.close()
console.log('captures in .compare/ — compare against archive/screenshots/')
```

- [ ] **Step 2: Add the script and ignore its output**

`package.json`:

```json
    "compare": "bun scripts/compare-screenshots.ts"
```

Append `.compare/` to `.gitignore`.

- [ ] **Step 3: Run the comparison**

```bash
bun run build
bun run preview &
sleep 3
bun run compare
```

Expected: a capture per page per viewport in `.compare/`.

- [ ] **Step 4: Compare each page against its archived screenshot**

For each of the 22, open `.compare/<slug>.desktop.png` beside
`archive/screenshots/<archived-slug>.desktop.png`. The year pages compare against
their old slugs: `/progress/2026/` against `2025-2-2.desktop.png`.

Record any page that differs beyond the intended changes — the new `/progress/`
index, the added 2026 nav entry, and the dropped archives have no counterpart.
Fix real differences before proceeding.

- [ ] **Step 5: Add a site section to `README.md`**

Insert after the archiving section, before "What the archive holds":

```markdown
## The site

```
bun install
bun run dev        # local dev server
bun run build      # regenerates _redirects, then builds to dist/
bun run test:site  # site unit tests, on bun
bun run compare    # captures the built pages for comparison with the archive
```

`bun run test:site` and `bun run build` cover the site. The phase 1 scraper still
runs on Node via `pnpm test` and `pnpm typecheck` — two runtimes in one repo is
deliberate: bun for the site, Node for the playwright-and-vitest scraper that
already works.

English is at the root, unprefixed. Spanish and Galician are prefixed, and their
content is phase 2b — the dropdown already offers all three and sends an
untranslated language to its home rather than a 404.

The URL parity test in `tests/parity.test.ts` is the one that matters: it reads
`archive/seo/sitemap-urls.csv` and fails if any of the 22 archived URLs neither
built a page nor got a redirect.
```

- [ ] **Step 6: Full verification**

Run: `bun run build && bun run test:site && pnpm test && pnpm typecheck`
Expected: all PASS. The site suite and the phase 1 scraper suite are both green.

- [ ] **Step 7: Commit**

```bash
git add scripts/compare-screenshots.ts package.json .gitignore README.md
git commit -m "feat(site): screenshot comparison script and site documentation"
```

---

### Task 13: The Spanish and Galician home pages

**Files:**
- Create: `src/content/pages/es/home.mdx`, `src/content/pages/gl/home.mdx`
- Create: `src/pages/[locale]/index.astro`
- Test: `tests/locale-routes.test.ts`

**Interfaces:**
- Consumes: the `pages` collection, `BaseLayout`, `localesFor`, `LOCALES`, `DEFAULT_LOCALE`.
- Produces: `/es/` and `/gl/`, so the dropdown's fallback target resolves.

**Why this is in 2a and not 2b.** The approved design says an untranslated page
sends the visitor to that locale's home, never to a 404. Ship the dropdown without
these two pages and every ES or GL click from any of the 22 pages 404s. Serving
the English home under `/es/` is not an option — `fallback` is off precisely to
avoid duplicate content.

Translate the home page's own copy. The source text is in
`archive/content/pages/home.md`; its sections are the hero wordmark, "The
Context", "This is our motto", "Stuff we do", "Our hackers", the villagers
paragraph, "We are proud of our partners" and "Follow us in real life". Draft both
translations from that, and **flag the Galician for human review** — it is the
locale most likely to read as machine output.

- [ ] **Step 1: Write the failing route test**

```ts
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'

describe('prefixed locale homes', () => {
  it('builds /es/ and /gl/, which the dropdown falls back to', () => {
    expect(existsSync('dist/es/index.html')).toBe(true)
    expect(existsSync('dist/gl/index.html')).toBe(true)
  })

  it('declares the right language on each', () => {
    expect(readFileSync('dist/es/index.html', 'utf8')).toContain('lang="es"')
    expect(readFileSync('dist/gl/index.html', 'utf8')).toContain('lang="gl"')
  })

  it('does not serve english under a prefixed url', () => {
    // fallback is off exactly so this cannot happen. A marker phrase from the
    // english home must not appear in the translations.
    const es = readFileSync('dist/es/index.html', 'utf8')
    expect(es).not.toContain('A movement for the revitalization of rural life')
  })

  it('canonicalises each to its own prefixed url', () => {
    expect(readFileSync('dist/es/index.html', 'utf8')).toContain(
      'rel="canonical" href="https://ruralhackers.com/es/"',
    )
  })

  it('advertises all three hreflangs on the home, which exists in all three', () => {
    const en = readFileSync('dist/index.html', 'utf8')
    for (const l of ['en', 'es', 'gl']) expect(en).toContain(`hreflang="${l}"`)
  })

  it('advertises only english on a page that is english-only', () => {
    // /about/ exists in en/ alone, so it must not claim es or gl alternates.
    const about = readFileSync('dist/about/index.html', 'utf8')
    expect(about).toContain('hreflang="en"')
    expect(about).not.toContain('hreflang="es"')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run build && bun run test:site`
Expected: FAIL — `dist/es/index.html` does not exist

- [ ] **Step 3: Create `src/pages/[locale]/index.astro`**

```astro
---
import { getCollection, render } from 'astro:content'
import BaseLayout from '../../layouts/BaseLayout.astro'
import { localesFor, splitId } from '../../lib/entries.ts'
import { DEFAULT_LOCALE, LOCALES } from '../../lib/i18n.ts'

export async function getStaticPaths() {
  const all = await getCollection('pages')
  const ids = all.map((e) => e.id)
  // English is unprefixed and has its own route at src/pages/index.astro.
  const prefixed = LOCALES.filter((l) => l !== DEFAULT_LOCALE)
  return all
    .filter((e) => {
      const { locale, slug } = splitId(e.id)
      return slug === 'home' && prefixed.includes(locale)
    })
    .map((entry) => ({
      params: { locale: splitId(entry.id).locale },
      props: { entry, availableLocales: localesFor(ids, 'home') },
    }))
}

const { entry, availableLocales } = Astro.props
const { locale } = splitId(entry.id)
const { Content } = await render(entry)
---
<BaseLayout
  title={entry.data.seoTitle ?? entry.data.title}
  description={entry.data.seoDescription}
  locale={locale}
  path="/"
  availableLocales={availableLocales}
>
  <Content />
</BaseLayout>
```

- [ ] **Step 4: Write the two translated home pages**

Create `src/content/pages/es/home.mdx` and `src/content/pages/gl/home.mdx`,
translating the sections listed above and composing them with the same blocks the
English home uses. Frontmatter mirrors the English entry's shape, with `title`,
`seoTitle` and `seoDescription` translated. Do not set `legacyUrl` — these are new
URLs with no WordPress predecessor.

- [ ] **Step 5: Build and verify the route tests pass**

Run: `bun run build && bun run test:site`
Expected: PASS. `dist/es/index.html` and `dist/gl/index.html` exist, and
`/about/` advertises only `hreflang="en"`.

- [ ] **Step 6: Check the dropdown resolves from a deep page**

```bash
bun run preview &
sleep 3
for p in / /about/ /hacker-days/ /progress/2026/; do
  echo "== $p"
  curl -s "http://localhost:4321$p" | grep -o 'href="/\(es\|gl\)/[^"]*"' | sort -u
done
```

Expected: every page offers `/es/` and `/gl/`, both of which now return 200. No
page offers a prefixed deep path that does not exist.

- [ ] **Step 7: Commit**

```bash
git add src/content/pages/es src/content/pages/gl src/pages/[locale] tests/locale-routes.test.ts
git commit -m "feat(site): spanish and galician home pages, so the dropdown never 404s"
```

---

## Self-Review

**Spec coverage.** Every phase 2 requirement in the design spec maps to a task:

| Spec requirement | Task |
| --- | --- |
| Design tokens ported verbatim, plain CSS not Tailwind | 2 |
| ~10 components, no `wp-block-*` class surviving | 8 |
| Content model: 4 collections, folder per locale, zod schemas | 6 |
| `prefixDefaultLocale: false`, `fallback` off, `trailingSlash: 'always'` | 1 |
| Language dropdown top-right, EN/ES/GL, missing → locale home | 4, 7 |
| `hreflang` only for locales that exist | 7 |
| 13 URLs preserved, 9 redirected, `/en/*` → `/` | 3, 11 |
| `/progress/` index replacing the dead `#` | 5, 10 |
| Both forms as Netlify Forms, honeypots dropped | 9 |
| Images via `<Image>` to AVIF/WebP, alt text required | 8, 10 |
| Netlify static deploy with `_redirects` | 11 |
| Build-time check that no archived URL 404s | 11 |
| Visual comparison against `archive/screenshots/` | 12 |
| Identical slugs across locales, override possible later | 4 (`localePath` derives from one base path) |

**Two spec deviations, both deliberate and approved:**

- The palette drops accent-2 and accent-3. The spec listed five accents; only
  three are referenced by anything.
- `h1` renders in Inter, reproducing a live CSS bug rather than the design's
  intent. Explicitly approved, and documented at the declaration.

**Placeholder scan.** No `TBD`, no "add error handling", no "similar to Task N".
Task 10 step 9 lists 17 items rather than inlining 17 MDX files — that is
iterative authoring against a stated four-step method and a screenshot
acceptance check, not a hidden placeholder; the method, the frontmatter source,
the component vocabulary and the check are all specified.

**Type consistency.** `Locale` is defined once in `src/lib/i18n.ts` and imported
everywhere. `splitId`/`localesFor`/`pathFor` signatures match between Task 10's
test and its implementation. `dropdownTargets(current, path, existing)` is called
with that argument order in `LanguageDropdown.astro`. `PRESERVED` and `REDIRECTS`
are consumed by Tasks 11 and 12 exactly as Task 3 defines them. `BaseLayout`'s
props match every call site: `index.astro`, `[...slug].astro`,
`progress/index.astro`, `progress/[year].astro`, `blog/index.astro`.

**A defect this review caught and fixed.** The plan originally deferred all `es/`
and `gl/` content to phase 2b while still shipping the dropdown. That breaks the
approved design on day one: the dropdown's rule for an untranslated page is to
send the visitor to that locale's home, so with no `/es/` or `/gl/` home built,
every ES or GL click from all 22 pages would 404 — and serving the English home
there instead is exactly what `fallback: off` exists to prevent.

Task 13 fixes it by shipping the home page translated into both locales. That is
two pages of real translation rather than seventeen, it keeps the dropdown
honest, and it makes phase 2b purely additive.

**What phase 2a deliberately does not include.** The 17 remaining items in `es/`
and `gl/`. Those locales' deep pages do not exist, and the dropdown correctly
sends visitors to the locale home instead — which is the designed behaviour, not
a gap. Phase 2b fills them in, and needs no structural change to do it: the
collections, routes and dropdown already handle three locales.
