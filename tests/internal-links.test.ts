import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { REDIRECTS } from '../src/lib/urls.ts'

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []
  })

const pages = walk('dist').map((f) => ({ file: f, html: readFileSync(f, 'utf8') }))
const hrefs = (html: string) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!).filter((h) => h.startsWith('/'))

describe('internal links', () => {
  it('found pages to check', () => {
    expect(pages.length).toBeGreaterThan(0)
  })

  it('never points at a url that redirects', () => {
    // A link through a 301 costs a round trip and leaks the old address. The
    // redirect exists for inbound traffic we do not control, not for our own
    // markup. Ported content links to /2023-2/ in several places, so this is a
    // real trap rather than a hypothetical one.
    // Set<string>, not the literal union REDIRECTS infers, so `.has` accepts any href.
    const redirected = new Set<string>(REDIRECTS.map((r) => r.from))
    const offenders: string[] = []
    for (const { file, html } of pages) {
      for (const h of hrefs(html)) {
        if (redirected.has(h)) offenders.push(`${file} -> ${h}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('never links to the old wordpress host', () => {
    const offenders: string[] = []
    for (const { file, html } of pages) {
      // Canonicals, hreflang and og:url legitimately use the absolute origin.
      const body = html.replace(/<head>[\s\S]*?<\/head>/, '')
      for (const m of body.matchAll(/href="(https?:\/\/ruralhackers\.com[^"]*)"/g)) {
        offenders.push(`${file} -> ${m[1]}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
