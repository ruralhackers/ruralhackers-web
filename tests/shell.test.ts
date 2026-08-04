import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')

describe('the built front page', () => {
  it('declares english on the html element', () => {
    expect(html).toContain('lang="en"')
  })

  it('renders the language dropdown with all three languages', () => {
    expect(html).toContain('Change language')
    for (const label of ['EN', 'ES', 'GL']) expect(html).toContain(`>${label}<`)
  })

  it('sends untranslated locales to their home rather than a 404', () => {
    expect(html).toContain('href="/es/"')
    expect(html).toContain('href="/gl/"')
  })

  it('emits an hreflang for english', () => {
    expect(html).toContain('hreflang="en"')
  })

  it('gives Progress a real href and links 2026', () => {
    expect(html).toContain('href="/progress/"')
    expect(html).toContain('href="/progress/2026/"')
  })

  it('keeps Volunteering external', () => {
    expect(html).toContain('drive.google.com')
  })

  it('has a skip link and a main landmark', () => {
    expect(html).toContain('Skip to content')
    expect(html).toContain('id="main"')
  })

  it('sets a canonical at the site origin', () => {
    expect(html).toContain('rel="canonical" href="https://ruralhackers.com/"')
  })
})
