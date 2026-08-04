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
export const NAV: readonly NavItem[] = [
  { label: 'Contact', href: '/contact/' },
  {
    label: 'Progress',
    href: '/progress/',
    children: [
      { label: '2023', href: '/progress/2023/' },
      { label: '2024', href: '/progress/2024/' },
      { label: '2025', href: '/progress/2025/' },
      { label: '2026', href: '/progress/2026/' },
    ],
  },
  {
    label: 'Volunteering',
    href: 'https://drive.google.com/file/d/1CLBQpPOobUIOcbqR8wh7uMyHpMaJ0YEf/view',
    external: true,
  },
  { label: 'Residencies', href: '/rural-hackers-residencies/' },
]

export const SOCIAL: readonly { label: string; href: string }[] = [
  { label: 'Instagram', href: 'https://instagram.com/ruralhackers' },
  { label: 'YouTube', href: 'https://www.youtube.com/@ruralhackers' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/rural-hackers' },
]
