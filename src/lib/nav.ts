import type { Locale } from './i18n.ts'
import { ui } from './ui.ts'

export type NavItem = {
  label: string
  href: string
  external?: true
  children?: readonly NavItem[]
}

/**
 * Read from the archived header on 2026-08-04, with two deliberate repairs.
 *
 * `Progress` was a dead `#` — it now points at a real index, which the years
 * collection makes free. And 2026 was missing: the page exists, served at
 * /2025-2-2/, but no navigation linked it. Generating this from content is what
 * stops that recurring.
 */
export function navFor(locale: Locale): readonly NavItem[] {
  const t = ui(locale)
  return [
  { label: t.contact, href: '/contact/' },
  {
    label: t.progress,
    href: '/progress/',
    children: [
      { label: '2023', href: '/progress/2023/' },
      { label: '2024', href: '/progress/2024/' },
      { label: '2025', href: '/progress/2025/' },
      { label: '2026', href: '/progress/2026/' },
    ],
  },
  {
    label: t.volunteering,
    href: 'https://drive.google.com/file/d/1CLBQpPOobUIOcbqR8wh7uMyHpMaJ0YEf/view',
    external: true,
  },
  { label: t.residencies, href: '/rural-hackers-residencies/' },
  ]
}

/** The English navigation, kept for the tests that pin its shape. */
export const NAV = navFor('en')

export const SOCIAL: readonly { label: string; href: string }[] = [
  { label: 'Instagram', href: 'https://instagram.com/ruralhackers' },
  { label: 'YouTube', href: 'https://www.youtube.com/@ruralhackers' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/rural-hackers' },
]
