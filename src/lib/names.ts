/**
 * The strings that stay in English in every language: the names of things.
 *
 * Rural Hackers name their own programmes, projects and artworks, and a name is
 * not a sentence to be translated — "Rural Digital Projects" is what the project
 * is called, not a description of it. The rule the site follows:
 *
 *   a title that NAMES a thing stays as it is;
 *   a title that is a SENTENCE about what we did gets translated.
 *
 * So "Creative Residencies" and "The Gift of being Seen" are here, while
 * "We joined Reset Network" and "Speakers at T3chFest" are not — those read as
 * "Nos sumamos a Reset Network" and "Ponentes en el T3chFest".
 *
 * This list is the one place to change if a name should be translated after all.
 * Remove it here, translate it in the three content files, done —
 * `tests/translations.test.ts` reads this and will hold you to it either way.
 */
export const NAMES: readonly string[] = [
  // The organisation, its places and its partners
  'Rural Hackers',
  'Anceu Coliving',
  'Anceu Maker Space',
  'Maker Space',
  'Casa do Pobo de Anceu',
  'Comunidade de Montes de Anceu',
  'Eleven Yellow',
  'WordPress Pontevedra',
  'WordPress.com',

  // Programmes
  'Creative Residencies',
  'Rural Digital Projects',
  'Sharing knowledge Events',
  'Sharing Knowledge Events',
  'Rural Hackers Residencies',
  'Past Rural Hackers Residencies',
  'Hacker Days',
  'RuralWO',

  // Recurring events and initiatives
  'A Fuchiqueira',
  'Anceu Fest',
  'Entre Culturas',
  'Green Misions',
  'TecnoArranxo',
  'Anceu Monsters',
  'Nova Lonxevidade Rural',
  'AventuraTech',
  'FemTech',
  'CanTech',
  'Rural IA',
  'Rural Hackers Magazine',

  // Named residencies, artworks and projects
  'Culture Moves Europe Residency',
  'Galicia Ilustrada',
  'Galicia Ilustrada Residency by Cami',
  'Human versus Machine Residency',
  'Mapping species Residency',
  'Casa do Pobo reopening residency',
  'Creative writing residency',
  'Robotics for kids',
  'Becoming cuco shortfilm',
  'As Indianas shortfilm',
  'Asi e Nito Comic',
  'Asi e Nito Comic by Chano',
  'Curiositech and Do Action Hackathon',
  'Lembranzas: A Nostalgic Journey Through Time and Memory',
  'Mery: Where Art Meets Nature',
  'Where arts meets nature',
  'Square of Anceu',
  'Reframe Cam',
  'ReFrame Cam project',
  'Raices project',
  'The Gift of being Seen',
  'Natural Colors of the Forest',
  'Textile art in nature',
  'Upcycling and Sustainability Advocate',
  // Milestone titles built around one of the names above
  'The Gift of being Seen project in Anceu',
  'Natural Colors of the Forest – A Collective Creation',
  'Textile Art in Nature – Honoring Collective Creation',
  'Raíces: Our first project with Escuela Reina Sofía',
  'A mural for Ventín: Our first artistic step beyond Anceu',

  // Not names, but the same in all three languages anyway
  'Blog',
  'Rosario — Anceu, Ponte Caldelas',
]

const LOOKUP = new Set(NAMES.map((n) => n.toLowerCase()))

/**
 * Whether a string is expected to read the same in English, Spanish and Galician.
 *
 * Names appear on their own, as a seo title `<name> - Rural Hackers`, and as alt
 * text `Rural Hackers, <name>` — often with the name's first letter lowercased,
 * which is how the archived site wrote them. Deriving those three shapes here
 * keeps the list above to one entry per name.
 */
export function staysEnglish(s: string): boolean {
  if (/^\d{4}$/.test(s)) return true // a year page's own title
  if (/^[\d.,]+ euros?$/.test(s)) return true // a sum of money
  let t = s
  if (t.endsWith(' - Rural Hackers')) t = t.slice(0, -' - Rural Hackers'.length)
  else if (t.startsWith('Rural Hackers, ')) t = t.slice('Rural Hackers, '.length)
  return LOOKUP.has(t.toLowerCase()) || /^\d{4}$/.test(t)
}
