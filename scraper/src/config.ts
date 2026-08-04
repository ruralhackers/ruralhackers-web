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
