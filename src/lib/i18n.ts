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
 * 2a ships English plus both locale homes, so this fallback is the common case.
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
