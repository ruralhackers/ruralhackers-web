/**
 * The url surface, enumerated. 22 urls were indexed on 2026-08-04: 11 keep their
 * address exactly, 11 move with a 301.
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
  // Two of the three blog posts were unedited Twenty Twenty-Five demo copy about
  // a fictional florist called Fleurs — 127 and 139 words on flowers, nothing on
  // Rural Hackers. Dropped rather than republished; the urls still resolve.
  { from: '/the-delicate-charm-of-bloodwort-blooms/', to: '/blog/' },
  { from: '/the-story-of-sunflowers-and-their-little-visitors/', to: '/blog/' },
] as const satisfies ReadonlyArray<{ from: string; to: string }>

const BY_FROM = new Map<string, string>(REDIRECTS.map((r) => [r.from, r.to]))

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
