import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const src = readFileSync('src/components/MobileNav.astro', 'utf8')

describe('mobile navigation', () => {
  it('exists at all', () => {
    // Until this was built, 390px was served the stacked desktop nav as-is, where
    // the WordPress original had a responsive container behind a button.
    expect(html).toContain('aria-label="Menu"')
  })

  it('works without javascript', () => {
    // <details> opens and closes on its own. The inline script only adds Escape,
    // so the menu is still usable if it never runs.
    expect(src).toContain('<details')
    expect(src).toContain('<summary')
  })

  it('gives the button a 44px target, unlike the 24x24 it was ported from', () => {
    expect(src).toMatch(/width:\s*44px/)
    expect(src).toMatch(/height:\s*44px/)
  })

  it('lifts the close button above the panel', () => {
    /*
     * The panel is fixed and covers the header, so a close button left at its
     * normal z-index sits behind it and the only way out is the Escape key. That
     * works for whoever built it and traps everyone on a phone.
     */
    expect(src).toMatch(/\.mobile\[open\] summary\s*\{[^}]*position:\s*fixed/)
    expect(src).toMatch(/\.mobile\[open\] summary\s*\{[^}]*z-index:\s*21/)
    expect(src).toMatch(/\.panel\s*\{[^}]*z-index:\s*20/)
  })

  it('lists the Progress years rather than hiding them behind a hover', () => {
    // There is no hover on touch, so the desktop submenu pattern would make the
    // year pages unreachable from a phone.
    expect(src).toContain('class="sub"')
    for (const y of ['2023', '2024', '2025', '2026']) expect(html).toContain(`/progress/${y}/`)
  })

  it('carries the language links inside the panel', () => {
    // The desktop column is display:none below 782px, so without this the
    // switcher would vanish on phones entirely.
    expect(src).toContain('LanguageLinks')
  })
})
