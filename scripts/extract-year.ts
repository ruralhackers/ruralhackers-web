/**
 * Emits the MDX for a "Progress" year page from the archived block html.
 *
 * The year pages are a long run of one shape — a 32px heading, its copy, and a
 * photograph on alternating sides — eighteen times over. Transcribing that by
 * hand is where the errors the screenshot comparison keeps catching come from, so
 * the structure is read out of the archive and only the alt text is written by a
 * person afterwards.
 *
 * Run: bun scripts/extract-year.ts 2025-2 2025 > src/content/years/en/2025.mdx
 */
import { readFileSync } from 'node:fs'

const slug = process.argv[2]
const year = process.argv[3]
if (!slug || !year) {
  console.error('usage: bun scripts/extract-year.ts <archived-slug> <year>')
  process.exit(2)
}

const html = readFileSync(`archive/html/pages/${slug}.html`, 'utf8')

const decode = (s: string) =>
  s
    .replace(/&#8217;|&#039;|&rsquo;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

/**
 * Tags become markdown before they are dropped: links and bold carry meaning, and
 * stripping them outright turned "Edition V" from a link to an Instagram post into
 * the bare words. Internal year links are rewritten to their new /progress/ path.
 */
const strip = (s: string) =>
  decode(
    s
      .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, text: string) => {
        const inner = text.replace(/<[^>]+>/g, '').trim()
        const to = /ruralhackers\.com\/(20\d\d)-2(-2)?\/?$/.exec(href)
        const url = to ? `/progress/${to[2] ? '2026' : to[1]}/` : href
        return inner ? `[${inner}](${url})` : ''
      })
      .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, text: string) => {
        const inner = text.replace(/<[^>]+>/g, '').trim()
        return inner ? `**${inner}**` : ''
      })
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim()

type Milestone = { title: string; image: string | null; paras: string[] }

/**
 * Headings and images are paired by document position, not by splitting on the
 * heading. The year pages alternate sides, so half the photographs appear *before*
 * their heading — chunking at each h2 left thirteen of twenty-six milestones with
 * no image at all.
 */
const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)]
  .map((m) => ({ at: m.index!, title: strip(m[1]!) }))
  .filter((h) => h.title.length > 0)

const images = [...html.matchAll(/(?:data-src|src)="([^"]+)"/g)]
  .filter((m) => {
    const u = m[1]!
    return !u.startsWith('data:') && u.includes('/uploads/') && !/-\d+x\d+\.[a-z0-9]+$/i.test(u)
  })
  .map((m) => ({ at: m.index!, url: m[1]! }))

const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
  .map((m) => ({ at: m.index!, text: strip(m[1]!) }))
  .filter((p) => p.text.length > 0)

const takenImages = new Set<number>()
const milestones: Milestone[] = headings.map((h, i) => {
  const next = headings[i + 1]?.at ?? html.length
  const prev = headings[i - 1]?.at ?? 0
  // Nearest unclaimed image, searching this heading's own span first and then
  // back towards the previous heading, which is where an image-left one sits.
  const candidates = images
    .filter((im) => !takenImages.has(im.at) && im.at > prev && im.at < next)
    .sort((a, b) => Math.abs(a.at - h.at) - Math.abs(b.at - h.at))
  const img = candidates[0]
  if (img) takenImages.add(img.at)

  return {
    title: h.title,
    image: img ? img.url.split('/uploads/')[1]!.split('?')[0]! : null,
    paras: paragraphs
      .filter((p) => p.at > h.at && p.at < next)
      .map((p) => p.text)
      .filter((t) => !/^(Edition|More info)$/i.test(t)),
  }
})

const ident = (path: string, i: number) =>
  'img' + i + path.replace(/.*\//, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12)

const withImages = milestones.filter((m) => m.image)

const lines: string[] = []
lines.push('---')
lines.push(`title: "${year}"`)
lines.push(`seoTitle: ${year} - Rural Hackers`)
lines.push(`year: ${year}`)
lines.push(`legacyUrl: https://ruralhackers.com/${slug}/`)
lines.push('---')
lines.push('')
lines.push(
  "import { Section, Prose, Milestone } from '../../../components/blocks/index.ts'",
)
withImages.forEach((m, i) => {
  lines.push(`import ${ident(m.image!, i)} from '../../../assets/images/${m.image}'`)
})
lines.push('')
lines.push('{/*')
lines.push('  Generated from the archived block html by scripts/extract-year.ts, then')
lines.push('  reviewed. Every milestone is a 32px heading, its copy and a photograph on')
lines.push('  alternating sides — the shape the live year pages repeat down the page.')
lines.push('')
lines.push('  Alt text is derived from each milestone\'s own title. That is honest and')
lines.push('  useful — it tells a screen reader what the photograph is of — but it is not')
lines.push('  a description of the image itself. Worth refining by someone who was there.')
lines.push('  It is deliberately not empty: an empty alt asserts the image is decorative,')
lines.push('  and none of these are.')
lines.push('*/}')
lines.push('')
lines.push('<Section width="wide" space={50}>')
withImages.forEach((m, i) => {
  const side = i % 2 === 0 ? 'right' : 'left'
  const esc = (s: string) => s.replace(/"/g, '&quot;')
  // Lower-case the first letter unless the title starts with a proper noun, so the
  // alt reads as a phrase rather than a sentence fragment glued to a prefix.
  const subject = /^[A-Z][a-z]+ [a-z]/.test(m.title)
    ? m.title.charAt(0).toLowerCase() + m.title.slice(1)
    : m.title
  lines.push(
    `  <Milestone title="${esc(m.title)}" src={${ident(m.image!, i)}} alt="Rural Hackers, ${esc(subject)}" side="${side}">`,
  )
  if (m.paras.length > 0) {
    lines.push('    <Prose>')
    m.paras.forEach((p, j) => {
      lines.push(`      ${p}`)
      if (j < m.paras.length - 1) lines.push('')
    })
    lines.push('    </Prose>')
  }
  lines.push('  </Milestone>')
})
lines.push('</Section>')
lines.push('')

console.log(lines.join('\n'))
console.error(
  `${withImages.length} milestones with images (${milestones.length - withImages.length} without, dropped)`,
)
