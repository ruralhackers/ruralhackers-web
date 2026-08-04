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
