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
