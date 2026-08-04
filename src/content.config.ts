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
