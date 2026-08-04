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
pnpm archive:media       # 218 library images + harvested theme assets
pnpm archive:markdown    # rendered html -> markdown
pnpm archive:verify      # completeness assertions
pnpm archive:report      # archive/reports/inventory.md
pnpm archive:checksums   # sha256 of everything git does not hold
```

`snapshot` runs **before** `media`, unlike the anceu archive. The theme's three
fonts and its compiled stylesheets are referenced only from a rendered page's
inline `<style>`, so `media` harvests from `archive/pages-full/` as well as from
post content. Without that ordering the site's entire typography is absent from
the archive and nothing notices.

`pnpm test` runs the unit tests, `pnpm typecheck` the types.

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
