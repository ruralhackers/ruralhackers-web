# ruralhackers-web

Port of [ruralhackers.com](https://ruralhackers.com) from WordPress to Astro.
Phase 1 archives the existing site; phase 2 rebuilds it from that archive with
English, Spanish and Galician.

## The site is the live site

Every page is ruralhackers.com as it is served today, mirrored by
`bun run mirror` (`scripts/mirror-live.ts`): the html goes to `mirror/pages/`,
every stylesheet, font, image and script it needs to `public/wp-content/` and
`public/wp-includes/` at its original path. Astro emits each page untouched;
`tests/mirror.test.ts` checks the build byte for byte against the mirror.

Nothing is added to the original. The only removals are Google Analytics / Site
Kit and links to WordPress endpoints (feeds, oEmbed, wp-json) a static host has
not got. New content goes in `mirror/additions/` and `src/lib/year-2026.ts`, so
it survives a re-mirror.

**Since 2026-11-14 ruralhackers.com is this site**, so `bun run mirror` would
copy the static site from itself. WordPress is still on Hostinger
(217.65.147.26) but no longer has a hostname; to mirror from it again, point a
hostname at that IP first and change `ORIGIN` in `scripts/mirror-live.ts`.

## Deploying

A Cloudflare Worker with static assets (`wrangler.jsonc`), on the
`ruralhackers.com` and `www.ruralhackers.com` custom domains:

```
bun run deploy      # astro build + wrangler deploy
```

- `src/worker.ts` runs only for `/`, to redirect WordPress's `/?p=ID` links.
- `_redirects` and `_headers` (generated / in `public/`) handle the other old
  WordPress urls and the cache of `/wp-content`.
- `www` goes to the apex through a redirect rule on the zone, and the zone has
  Always Use HTTPS on. Before the move the apex was an A record to Hostinger
  (217.65.147.26) and `www` a CNAME to the apex: restoring those two records
  (and removing the custom domains) rolls back.

## Archiving

```
bun install
bunx playwright install chromium
bun run archive
```

Stages run in order and each is resumable, so an interrupted run is continued by
re-running the same command. Individually:

```
bun run archive:discover    # sitemaps -> 22 urls
bun run archive:content     # 15 pages, 3 posts, taxonomies, Yoast metadata
bun run archive:snapshot    # full page html + desktop/mobile screenshots
bun run archive:media       # 218 library images + harvested theme assets
bun run archive:markdown    # rendered html -> markdown
bun run archive:verify      # completeness assertions
bun run archive:report      # archive/reports/inventory.md
bun run archive:checksums   # sha256 of everything git does not hold
```

`snapshot` runs **before** `media`, unlike the anceu archive. The theme's three
fonts and its compiled stylesheets are referenced only from a rendered page's
inline `<style>`, so `media` harvests from `archive/pages-full/` as well as from
post content. Without that ordering the site's entire typography is absent from
the archive and nothing notices.

`bun run test` runs the unit tests, `bun run typecheck` the types.

bun is the only package manager; there is one lockfile. The scraper still
**runs** on Node — `node scraper/src/cli.ts` — because that is what its
playwright usage is proven against. Installing with bun and executing with Node
was verified: all 117 tests pass and every stage runs.

## What the archive holds

208 MB across 301 unversioned files, plus the text in git.

| Path | Contents |
| --- | --- |
| `archive/raw/` | Verbatim REST responses. The insurance policy — never edited. |
| `archive/html/` | Rendered block markup, showing how each page was composed. |
| `archive/content/` | Clean Markdown. The input to phase 2 and the text for translators. |
| `archive/media/` | 234 files at their original upload paths, with `manifest.json`. |
| `archive/pages-full/` | Fully rendered pages as served. |
| `archive/screenshots/` | Desktop and mobile full-page captures. The visual reference for phase 2. |
| `archive/seo/` | `url-inventory.csv`, `sitemap-urls.csv` and per-item Yoast metadata. |
| `archive/reports/` | `inventory.md` and `checksums.sha256`. |

Three representations of every content item is deliberate: `raw/` survives a
lossy transform, `html/` records structure the rebuild discards, `content/` is
what you actually author from.

## Important

**`archive/media/`, `archive/screenshots/` and `archive/pages-full/` are
gitignored for size and are the irreplaceable part of this repo.** Back them up
off this machine before WordPress is switched off. Everything else can be
regenerated only while the old site is still up.

`archive/reports/checksums.sha256` *is* committed, so a backup can be verified
years from now with `sha256sum -c` and nothing else from this repo.

## What the archive found

- **The media library omits 7 images the site actually uses.** They were
  recovered by harvesting page markup, which is why the media stage reads two
  sources instead of trusting the library listing.
- **6 compiled stylesheets**, not one — different pages serve different
  SiteGround bundles. All are archived; together they are the design's source of
  truth for extracting tokens.
- **96% of images have no alt text** (215 of 225). Phase 2's accessibility debt,
  quantified.
- **134 images whose recorded filesize is stale**, because SiteGround
  re-compressed them and WordPress never updated its own record. Recorded as
  warnings; the server serves exactly what was stored.
- **There are two contact forms, not one:** WPForms 526 on `/contact/` with 4
  fields, and WPForms 716 on `/hacker-days/` with 5. Phase 2 needs two Netlify
  Forms.

### The archive is not byte-stable, and that is the source's doing

Re-running `content` rewrites `contact` and `hacker-days` every time. Both carry
a WPForms form, and WPForms emits two things that change per request:

- `data-token-time`, an anti-spam timestamp.
- A honeypot field whose `<label>` is randomised from words on the page, so
  field 4 reads `to Hacker be` on one fetch and `part you you` on the next.

Nothing is lost and nothing is wrong. Do not chase it as a bug, and do not
diff-check the archive expecting silence — compare the other 16 items instead.

## Before starting phase 2

Read `docs/superpowers/specs/2026-08-04-ruralhackers-wordpress-to-astro-design.md`.
It records facts about the source site that are not guessable and that will
break the rebuild if ignored:

- **Slugs do not determine URLs.** The page slugged `home` is served at `/`. Use
  the `link` field, never the slug.
- **Trailing slashes are canonical.** Astro needs `trailingSlash: 'always'`.
- **English must stay at the root, unprefixed** (`prefixDefaultLocale: false`).
  All 22 existing URLs are English at the root; `/en/*` redirects to `/`.
- **Astro's i18n `fallback` must stay off**, or every English page gets a
  duplicate at `/es/` and `/gl/` serving English.
- **`X-WP-Total` overreports media by 2.** 218 are retrievable, not 220.
  Expected counts are enumerated, never read from headers.
- **The display font is licensed as "OffBit Trial".** Buy the production licence
  or replace it before going live.
- **The 2026 page is served at `/2025-2-2/`** and is in no navigation. Phase 2
  serves it at `/progress/2026/` and 301s the old path.
- **The `blog` page has no content of its own** — WordPress renders the posts
  index from a template. It is the one page allowed an empty body.
