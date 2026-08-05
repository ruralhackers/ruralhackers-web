/**
 * Writes public/_redirects from src/lib/urls.ts.
 *
 * Generated rather than hand-maintained so the redirect table and the tests that
 * check it cannot drift apart.
 *
 * Run by `bun run build` before astro, so a build can never ship without them.
 */
import { writeFileSync } from 'node:fs'
import { renderRedirects } from '../src/lib/urls.ts'

writeFileSync('public/_redirects', renderRedirects(), 'utf8')
console.log('wrote public/_redirects')
