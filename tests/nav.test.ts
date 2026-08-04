import { describe, it, expect } from 'vitest'
import { NAV, SOCIAL, type NavItem } from '../src/lib/nav.ts'

const flat = (items: readonly NavItem[] = NAV): { label: string; href: string }[] =>
  items.flatMap((i) => [{ label: i.label, href: i.href }, ...flat(i.children ?? [])])

describe('NAV', () => {
  it('keeps the four top-level items the old header had', () => {
    expect(NAV.map((i) => i.label)).toEqual([
      'Contact',
      'Progress',
      'Volunteering',
      'Residencies',
    ])
  })

  it('gives Progress a real destination instead of the dead # it had', () => {
    const progress = NAV.find((i) => i.label === 'Progress')!
    expect(progress.href).toBe('/progress/')
  })

  it('includes 2026 under Progress, which the old nav omitted', () => {
    const years = NAV.find((i) => i.label === 'Progress')!.children!
    expect(years.map((y) => y.label)).toEqual(['2023', '2024', '2025', '2026'])
    expect(years.find((y) => y.label === '2026')!.href).toBe('/progress/2026/')
  })

  it('keeps Volunteering pointing off-site', () => {
    const v = NAV.find((i) => i.label === 'Volunteering')!
    expect(v.external).toBe(true)
    expect(v.href).toContain('drive.google.com')
  })

  it('uses internal slashed paths everywhere else', () => {
    const internal = flat().filter((i) => !i.href.startsWith('http'))
    expect(internal.filter((i) => !i.href.endsWith('/'))).toEqual([])
  })
})

describe('SOCIAL', () => {
  it('carries the three footer links', () => {
    expect(SOCIAL.map((s) => s.label)).toEqual(['Instagram', 'YouTube', 'LinkedIn'])
    expect(SOCIAL.every((s) => s.href.startsWith('https://'))).toBe(true)
  })
})
