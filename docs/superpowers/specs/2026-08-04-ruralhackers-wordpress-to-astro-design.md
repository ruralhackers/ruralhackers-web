# Rural Hackers — WordPress to Astro Port

**Date:** 2026-08-04
**Status:** Approved design, phase 1 ready to implement

## Goal

Move ruralhackers.com off WordPress onto a statically built Astro site that
deploys itself to Netlify, keeping the existing visual design and adding
Spanish and Galician alongside English.

The driver is **content authoring**. Content lives as Markdown in git with a
schema, so an AI agent can write and revise it directly, open a pull request,
and let Netlify build a preview. That is the whole reason this is a port and
not a multilingual plugin on the existing WordPress — a plugin would solve
translation and nothing else.

The work splits in two:

- **Phase 1 — archive.** Freeze the current WordPress into a durable local
  archive while it is still online. Irreproducible once Hostinger is switched
  off. This is the deliverable now.
- **Phase 2 — rebuild.** Build the Astro site from that archive. Gets its own
  implementation plan once the archive exists.

## What's on the current site

WordPress on Hostinger (LiteSpeed, PHP 8.2), Twenty Twenty-Five block theme
extended by Twentig, Yoast SEO, WPForms, SiteGround Optimizer, Google Site Kit.
The REST API is open and unauthenticated, so the archive comes from `wp-json`
rather than HTML parsing.

| Type | Count | Notes |
| --- | --- | --- |
| Pages | 15 | All flat (`parent: 0`). 14 in `page-sitemap`; `/blog/` is in `post-sitemap` |
| Posts | 3 | Dated 2024-11-09 to 2025-04-29 |
| Categories | 2 | `uncategorized` (2 posts), `uncategorized-en` (1) |
| Tags | 0 | Nothing to port |
| Users | 5 | Only 2 have author archives |
| Media | **218 retrievable** | 220 reported. 113 JPEG, 89 PNG, 16 WebP, ~107 MB |

**Total public URL surface: 22.** 4 post URLs (blog index + 3 posts), 14 page
URLs, 2 category archives, 2 author archives.

Content is ~370 KB of rendered HTML across 15 pages. The heaviest are the yearly
recaps: 2025 at 65 KB, 2024 at 50 KB, 2023 at 45 KB — photo-dense column grids.

### The block vocabulary is tiny

Every page is built from 13 generic layout primitives. There are no custom
blocks, no sliders, no plugin-rendered frontend beyond the contact form:

```
416 paragraph   269 column    186 group    177 heading   150 image
128 columns      22 flex       19 spacer     17 button     15 quote
 13 cover         9 separator   3 list        1 gallery
```

This is what makes a token-based rebuild realistic rather than aspirational:
roughly ten Astro components cover the entire site.

### The design system is small

Read from the live `global-styles-inline-css`:

| | |
| --- | --- |
| Accents | `#e56529` orange · `#4c1f7a` purple · `#219b9d` teal · `#686868` · `#eeeeee` |
| Base / text | `#FFFFFF` / `#111111` |
| Fonts | Inter (variable) + OffBit Trial (display) |
| Type scale | Fluid `clamp()`, e.g. `xx-large: clamp(2.15rem, 2.15rem + ((1vw - 0.2rem) * 1.333), 3rem)` |

Two fonts and three accents. Reproducing this exactly is a small, bounded job.

## Findings that drive the design

**Slugs do not determine URLs.** `page_on_front` is page 13, whose slug is
`home` but which is served at `/`. Deriving URLs from slugs would move the
homepage to `/home/`. The REST `link` field is authoritative and is the only URL
source the scraper trusts. Same failure mode as the anceu archive.

**`X-WP-Total` overreports media by 2.** The header says 220; paginating returns
98 + 100 + 20 = 218, consistently. This is the same WordPress count-vs-query
mismatch seen on anceu.com (which overreported by 61) — the count includes
attachments the public REST API will not serve. **218 is the expected count and
is enumerated, not read from the header.** Correcting it to 220 makes every
verification run fail.

**Trailing slashes are canonical.** Astro must set `trailingSlash: 'always'`.

**All 22 URLs are English and unprefixed at the root.** `<html lang="en-US">`,
no i18n plugin. Adding an `/en/` prefix would discard the site's entire search
equity. English must stay at the root.

**The display font is a trial licence.** The family is literally named
`OffBit Trial`, served as two `.otf` files (`OffBitTrial-101.otf`,
`OffBitTrial-101Bold.otf`) over plain `http://`. Beyond the licensing exposure,
`.otf` means no `woff2` and no subsetting — it is the heaviest possible way to
ship a display face. Recorded as an open decision below; it does not block
phase 1.

**The taxonomy is junk and the author archives leak an email.** The only two
categories are `uncategorized` and `uncategorized-en`, across three posts. The
two author archives are `/author/nacho/` and `/author/agustinanceu-com/` — and
that second user's public display name is the string `agustin@anceu.com`, an
email address exposed on a public archive page. Neither archive earns its
existence at this content volume. Phase 2 drops all four and 301s them to
`/blog/`, which removes the exposed address as a side effect.

**The 2026 page exists but is unreachable.** Page 1021, titled "2026", is served
at `/2025-2-2/` — a WordPress slug collision — and appears in no navigation. The
nav's "Progress" dropdown links 2023, 2024 and 2025 only. The programme pages
(`hacker-days`, `creative-residencies`, `rural-digital-projects`,
`sharing-knowledge-events`, `ruralwo`, `rural-hackers-residencies`) are also
absent from the nav and reachable only from the homepage. Generating navigation
from content collections stops this recurring.

**One nav item points off-site.** "Volunteering" links to a Google Drive file,
not a page. It stays an external link.

## Phase 1 — the archive

The anceu.com archive scraper is **copied into this repo and adapted, not
extracted into a shared package.** It is already config-driven, so adapting it
means changing `BASE_URL`, replacing the expected counts, and removing the
`hb_accommodation` post type. Two consumers do not justify a shared package, and
coupling anceu's in-flight archive to a refactor would add risk for no benefit.
This duplication is deliberate; if a third site appears, extract then.

Seven resumable stages, run by `pnpm archive` or individually:

```
discover    sitemaps -> url inventory
content     pages, posts, categories, users, Yoast metadata
media       218 files, ~107 MB, at original upload paths
markdown    rendered html -> markdown
snapshot    full rendered page html + desktop/mobile screenshots
verify      completeness assertions against expected counts
report      archive/reports/inventory.md
```

Expected counts, verified against the live API on 2026-08-04:

```
pages: 15    posts: 3    categories: 2    tags: 0    users: 5    media: 218
```

Archive layout, matching the anceu repo:

| Path | Contents |
| --- | --- |
| `archive/raw/` | Verbatim REST responses. Never edited. |
| `archive/html/` | Rendered block markup, recording how each page was composed. |
| `archive/content/` | Clean Markdown. The input to phase 2 and the text translators work from. |
| `archive/media/` | 218 files at original upload paths, plus `manifest.json`. |
| `archive/pages-full/` | Fully rendered pages as served. |
| `archive/screenshots/` | Desktop and mobile full-page captures — the visual reference for phase 2. |
| `archive/seo/` | `url-inventory.csv` and per-item Yoast metadata. |
| `archive/reports/` | Inventory, including which of the 218 media files are actually referenced. |

Three representations of every item is deliberate: `raw/` survives a lossy
transform, `html/` records structure the rebuild discards, `content/` is what
you author from.

The `snapshot` stage carries specific weight here: the contact page's WPForms
form (id 526) is rendered by a plugin, so the archived markup is the only record
of its fields, labels and required flags. Phase 2 reproduces the form from that
snapshot.

`archive/media/` is gitignored for size. **It is the irreplaceable part of this
repo and must be backed up off this machine before WordPress is switched off.**

## Phase 2 — the Astro site

### Design tokens

The `clamp()` scale and the colour palette are ported verbatim into a single
`tokens.css` as custom properties. Per-component styling uses Astro scoped
styles.

**Plain CSS, not Tailwind.** The theme's fluid `clamp()` values *are* the
typographic scale; re-expressing them in a Tailwind config is a lossy
translation for no gain. Custom properties map one-to-one onto what the site
already ships.

### Components

Ten components cover the 13 block types:

`Section` (constrained / flex / grid) · `Columns` / `Column` · `Prose` ·
`Image` · `Gallery` · `Cover` · `Quote` · `Buttons` · `Spacer` / `Separator`

No `wp-block-*` class survives the port.

### Content model

```
src/content/
  years/{en,es,gl}/2023.mdx … 2026.mdx      "Progress" — yearly recaps
  programmes/{en,es,gl}/hacker-days.mdx …   6 entries
  posts/{en,es,gl}/…                        3 entries
  pages/{en,es,gl}/{home,about,contact,privacy}.mdx
```

Three collections plus four singletons. A folder per locale rather than a
`.en.mdx` suffix, so "does this translation exist" is answered by file presence —
which is what the language dropdown needs.

Every collection has a zod schema. That schema is the contract an AI agent
writes against; it is the mechanism that makes "generate a 2027 recap" a
one-file operation rather than a layout exercise.

Note that page 14 (`about`) currently uses the theme's `page-no-title`
template, so its heading is part of the content rather than the layout. The
rebuild must not reintroduce a title there.

### i18n and the language dropdown

Astro i18n configured as:

```
defaultLocale: 'en'
prefixDefaultLocale: false     // English stays at the root
fallback: (unset)              // must stay off
trailingSlash: 'always'
```

**`fallback` must stay off.** Enabling it duplicates every English page at
`/es/` and `/gl/` serving English text — duplicate content, penalised.

Slugs are **identical across the three locales** for now. Spanish and Galician
are new URLs with no equity to lose, and identical slugs make the dropdown's
locale mapping free. A per-locale slug override in frontmatter can be added
later without restructuring.

The **language dropdown sits top-right, EN / ES / GL**:

- Translation exists → link to it.
- Translation missing → link to that locale's homepage. Never a 404, and never
  English served under an `/es/` URL.
- `hreflang` emitted only for locales that actually exist for that page.

This matters during the migration, when most pages will exist in English only.

### URL map

Preserved **exactly** — 13 URLs:

```
/                                              /blog/
/about/                                        /the-delicate-charm-of-bloodwort-blooms/
/contact/                                      /the-story-of-sunflowers-and-their-little-visitors/
/hacker-days/                                  /speakers-at-festival-creativa/
/creative-residencies/
/rural-digital-projects/
/sharing-knowledge-events/
/ruralwo/
/rural-hackers-residencies/
```

Cleaned, with 301s from the old paths:

| Old | New |
| --- | --- |
| `/2023-2/` | `/progress/2023/` |
| `/2024-2/` | `/progress/2024/` |
| `/2025-2/` | `/progress/2025/` |
| `/2025-2-2/` | `/progress/2026/` |
| `/privacy-policy-2/` | `/privacy-policy/` |

These are recap pages with next to no external inbound links, the `-2` suffixes
are WordPress collision artefacts, and a 301 preserves whatever equity exists.
The clean structure is also what makes collection-driven routing coherent.

Dropped, 301 to `/blog/`:

```
/category/uncategorized/      /author/agustinanceu-com/
/category/uncategorized-en/   /author/nacho/
```

New:

- `/es/` and `/gl/`, with all their subpaths.
- `/en/*` → `/:splat`, 301. Astro generates no `/en/` routes with
  `prefixDefaultLocale: false`, so this catches anyone who guesses the prefix.
- `/progress/` — an index listing the year entries. The nav's "Progress" parent
  is currently a dead `#` link; the collection makes a real index free. This is
  a small deliberate addition rather than a reproduction of the current site.

All redirects live in Netlify's `_redirects`.

### Forms

The contact page's WPForms form becomes a **Netlify Form**: a plain HTML form
with `data-netlify="true"`, a honeypot field, no JavaScript. Fields are
reproduced from the phase 1 snapshot.

This is the concrete reason for choosing Netlify over Cloudflare Pages — on
Cloudflare the same form needs a Worker.

### Images

`archive/media/` (107 MB) is gitignored: it is the insurance copy and lives in
off-machine backup.

The repo commits only the images the new site actually references — the phase 1
report enumerates which of the 218 those are — under `src/assets/`, processed by
Astro's `<Image>` into responsive AVIF/WebP. The current site serves unoptimised
originals through lazysizes, so this is a substantial free performance win.

### Deploy

Netlify. `astro build` → `dist/`, Node 24. Deploy previews on every pull
request, production on merge to `main`. `_redirects` for the table above,
`_headers` for asset caching.

## Verification

**Phase 1.** Vitest unit tests on the scraper, mirroring the anceu suite. The
`verify` stage asserts the enumerated counts above and fails loudly on drift.

**Phase 2**, enforced at build time:

- Every URL in `archive/seo/url-inventory.csv` either resolves in the new site
  or has a redirect. No silent 404s.
- Every collection entry validates against its zod schema.
- No page renders English content under an `/es/` or `/gl/` URL.
- Emitted `hreflang` matches the translations that exist on disk.

**Visual.** New pages compared against `archive/screenshots/` at desktop and
mobile widths. With a palette this small the comparison is tractable by eye.

## Open decisions

**The OffBit Trial licence is unresolved and is not a technical call.** Options:
buy the production licence, replace the display face, or ship without a display
face. Phase 1 is unaffected; phase 2 can proceed using it locally and swap
before going live. Flagged here so it does not go live by default.

**Who writes the Spanish and Galician copy.** The design assumes an AI agent
drafts from the English source, with a human reviewing — particularly for
Galician. Not a blocker for either phase, but the site ships English-only until
someone does it.

## Out of scope

- Redesign. The visual design is reproduced, not revised.
- The blog as a content strategy. Three posts are ported as they are.
- Migrating Google Site Kit / Analytics. GTM `GT-W6XPTNRK` is re-added as a
  plain tag if wanted.
- A visual CMS. The content model is deliberately compatible with a git-based
  CMS (Decap, Tina) reading the same Markdown and frontmatter, so one can be
  added later without migrating content. Not built now.
