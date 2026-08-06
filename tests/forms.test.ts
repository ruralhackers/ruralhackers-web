import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const contact = readFileSync('src/components/ContactForm.astro', 'utf8')
const hackerDays = readFileSync('src/components/HackerDaysForm.astro', 'utf8')

describe('ContactForm', () => {
  it('is a netlify form with a honeypot and no javascript', () => {
    expect(contact).toContain('data-netlify="true"')
    expect(contact).toContain('data-netlify-honeypot')
    expect(contact).not.toContain('<script')
  })

  it('carries the three real fields from WPForms 526', () => {
    for (const n of ['name', 'email', 'message']) {
      expect(contact).toContain(`name="${n}"`)
    }
  })

  it('requires name and email but not the message', () => {
    expect(contact).toMatch(/name="name"[^>]*required/)
    expect(contact).toMatch(/name="email"[^>]*required/)
    expect(contact).not.toMatch(/name="message"[^>]*required/)
  })

  it('does not reproduce the wpforms honeypot label', () => {
    // field_4's label is randomised gibberish, different on every request.
    expect(contact).not.toContain('Email Name Message')
  })
})

describe('HackerDaysForm', () => {
  it('carries the four real fields from WPForms 716', () => {
    for (const n of ['name', 'email', 'motivation', 'contribution']) {
      expect(hackerDays).toContain(`name="${n}"`)
    }
  })

  it('requires all four, as the source form does', () => {
    for (const n of ['name', 'email', 'motivation', 'contribution']) {
      expect(hackerDays).toMatch(new RegExp(`name="${n}"[^>]*required`))
    }
  })

  it('asks about the current edition, not the one the live site is stuck on', () => {
    // The live form still says 2025. Updated at the owners' request; asserted
    // against the current year so it fails again next January rather than
    // quietly going stale a second time.
    const year = new Date().getFullYear()
    expect(hackerDays).toContain(`Why would you like to be part of Hacker Days ${year}?`)
  })

  it('does not reproduce the wpforms honeypot label', () => {
    expect(hackerDays).not.toContain('to Hacker be')
  })
})
