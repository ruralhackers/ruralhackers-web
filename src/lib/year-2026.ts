/**
 * The /2026/ Progress page.
 *
 * The live site has no 2026 year page: its 2026 content is one long article at
 * /2025-2-2/, laid out as a post, not like the other years. This builds /2026/
 * in the year pages' own design by taking the mirrored 2025 page as the shell
 * (same head, header, css and footer) and swapping in the 2026 entries below.
 * The article stays at /2025-2-2/ and the first entry links to it.
 *
 * There is no funding band: the 2026 figures are not known yet. Add `funding`
 * to show one.
 */
import { readFileSync } from 'node:fs'
import { addProgress2026 } from './additions.ts'

interface Entry {
  title: string
  /** Paragraphs of html. */
  body: string[]
  /** File in public/wp-content/uploads/, and what it shows. */
  image?: { src: string; width: number; height: number; alt: string }
}

const ENTRIES: Entry[] = [
  {
    title: 'AventuraTech',
    body: [
      'Since 3 February, every Tuesday morning, people over 60 meet at Rural Champs in Anceu for functional and strength training while they learn digital tools. Led by Víctor of Rural Champs, free, and no computer needed.',
      'AventuraTech is one of the three strands of Nova Lonxevidade Rural, with the support of Fundación la Caixa. Hear the participants in their own words: <a href="https://www.instagram.com/reel/DaStlgSIZpH/">part one</a> and <a href="https://www.instagram.com/reel/DaaEEhoo0r8/">part two</a>.',
    ],
    image: {
      src: '2026/11/aventuratech.jpg',
      width: 1600,
      height: 1073,
      alt: 'AventuraTech participants telling their story, and a training session on the gym mats',
    },
  },
  {
    title: 'Entre Culturas celebrates Beautiful Bees',
    body: [
      'On 28 February we celebrated what the 24 young women of Beautiful Bees built in our village with a Fuchiqueira and an Entre Culturas at the Casa do Pobo.',
      'A sensory walk along the Camiños dos Sentidos, upcycled denim sewing, creative writing, strawberries and DNA; then a shared lunch with musical bingo, the screening of the short documentary <em>Lembranzas de Anceu</em>, a German pretzel workshop and hot chocolate on the new benches of the Barazal botanical park.',
    ],
    image: {
      src: '2026/11/entre-culturas-shared-meal.jpg',
      width: 1200,
      height: 1030,
      alt: 'People sharing a meal at a long white table in the Casa do Pobo de Anceu',
    },
  },
  {
    title: 'CanTech',
    body: [
      'Learning to manage our emotions while helping abandoned dogs from the Protectora do Morrazo, with the animal-assisted intervention team of Cocan, and picking up digital skills along the way.',
      'Free sessions at the Casa do Pobo on 7 March, 18 April, 16 May, 28 June and 26 September. CanTech is another strand of Nova Lonxevidade Rural.',
    ],
    image: {
      src: '2026/11/cantech.jpg',
      width: 1600,
      height: 1073,
      alt: 'A CanTech session at the Casa do Pobo: participants at the tables, a dog being stroked and a white rabbit on the tiled floor',
    },
  },
  {
    title: 'Fixar 3',
    body: [
      'The third edition of <a href="https://www.fixar.gal/">Fixar</a> opened in April, once again bringing people who want to build their projects in rural Galicia to live and work together in a coliving.',
    ],
  },
  {
    title: 'FemTech',
    body: [
      'The third strand of Nova Lonxevidade Rural: women from the villages learning digital tools together. Atlántico Diario wrote about the group, and the first season closed in June with <a href="https://www.instagram.com/reel/DaNtuGssRJA/">this video</a>.',
    ],
  },
  {
    title: 'The European Union in the Villages',
    body: [
      'On 20 June we hosted “A Unión Europea nos Pobos” in Gaxate, Vilán and Anceu, as part of the 4Data Democracy project. Instead of collecting data, we had breakfast with our neighbours and listened to their dreams and worries for the future of our villages.',
      'About 80 people joined us. Local innovators sat down as “living books” in a Human Library, and the day closed with a communal paella and live music.',
      '<a href="/2025-2-2/">Read the full report</a>.',
    ],
    image: {
      src: '2026/07/IMG_20260620_124841-1024x771.jpg',
      width: 1024,
      height: 771,
      alt: 'Neighbours sitting in a large circle in a village hall in Anceu on 20 June 2026',
    },
  },
  {
    title: 'A year of Fuchiqueiras',
    body: [
      '16 May, the eve of the Día das Letras Galegas: we embroidered the letter G and shared our favourite books in Galician. 28 June: the season closed with a Fuchiqueira dedicated to everyone in Nova Lonxevidade Rural. 11 July: water, Gaelic football and a barbecue at the Anceu Coliving pool.',
      'After the summer, newspaper basketry, comics, an imagined meeting with Rosalía de Castro, clay modelled blindfolded and TecnoArranxo on 5 September; another edition on 26 September; and on 3 October a special edition for people over 60 within the <em>De Vella a Bella Fest</em>, with plant dyes, recycled collage, felt notebooks and calligraphy.',
    ],
    image: {
      src: '2026/11/fuchiqueira-2026.jpg',
      width: 1600,
      height: 1073,
      alt: 'Neighbours of all ages at a Fuchiqueira: drawing, crafting and sharing food at the Casa do Pobo',
    },
  },
  {
    title: 'Rural Hacker Fest in Ventín',
    body: [
      'As every year, the Rural Hacker Fest came back. This edition was held in the village of Ventín, where we had already painted our first collaborative mural beyond Anceu. Thanks to the neighbours of Ventín for trusting us with their village.',
    ],
  },
  {
    title: 'RURALI-ART',
    body: [
      'Two artistic residencies about the memory of Anceu. From 19 to 26 October, twelve artists spent a week with the neighbours recovering how the village lived its old festivals, and turned it into things anyone can use: an <a href="https://festas.anceu.com/">illustrated guide to the festivals</a>, a recovered phone booth, a card game for the sobremesa, panels for the Casa do Pobo and <a href="https://dance.anceu.com/">a website for dancing in the kitchen</a>.',
      'A second group followed from 2 to 8 November, using AI tools for their own creative projects, and on 8 November both groups presented their work to the neighbours of Anceu. An activity subsidised by Spain’s Ministry of Culture.',
    ],
    image: {
      src: '2026/11/rurali-art.jpg',
      width: 1600,
      height: 1200,
      alt: 'RURALI-ART artists and neighbours in Anceu, looking at portraits drawn during the residency and taped to the glass door',
    },
  },
]

const DESCRIPTION =
  'AventuraTech, CanTech and FemTech, the European Union in the villages, a year of Fuchiqueiras, the Rural Hacker Fest in Ventín and RURALI-ART.'

const GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const attr = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;')

const imageColumn = ({ src, width, height, alt }: NonNullable<Entry['image']>) => {
  const url = `/wp-content/uploads/${src}`
  return `<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow" style="flex-basis:56%">
<figure class="wp-block-image size-full"><img decoding="async" width="${width}" height="${height}" src="${GIF}" data-src="${url}" alt="${attr(alt)}" class="lazyload" style="aspect-ratio:4/3;object-fit:cover"><noscript><img decoding="async" width="${width}" height="${height}" src="${url}" alt="${attr(alt)}" style="aspect-ratio:4/3;object-fit:cover" /></noscript></figure>
</div>
`
}

const textColumn = (e: Entry, basis?: string) =>
  `<div class="wp-block-column is-vertically-aligned-center is-layout-flow wp-container-core-column-is-layout-0c22cdd7 wp-block-column-is-layout-flow"${basis ? ` style="flex-basis:${basis}"` : ''}>
<h2 class="wp-block-heading">${e.title}</h2>



${e.body.map((p) => `<p class="wp-block-paragraph">${p}</p>`).join('\n\n\n\n')}
</div>
`

/** Same markup as a WordPress year entry. Image entries alternate sides, text first. */
const renderEntries = (entries: Entry[]) => {
  let n = 0
  return entries
    .map((e) => {
      const columns = e.image
        ? n++ % 2 === 0
          ? `${textColumn(e)}\n\n\n\n${imageColumn(e.image)}`
          : `${imageColumn(e.image)}\n\n\n\n${textColumn(e)}`
        : textColumn(e, '56%')
      return `<div class="wp-block-group alignfull has-global-padding is-layout-constrained wp-block-group-is-layout-constrained" style="margin-top:0;margin-bottom:0;padding-top:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50)">
<div class="wp-block-columns alignwide is-layout-flex wp-container-core-columns-is-layout-b7f6f8cb wp-block-columns-is-layout-flex">
${columns}</div>
</div>`
    })
    .join('\n\n\n\n')
}

/** What the sitemap needs to know about /2026/. */
export const YEAR_2026 = {
  images: ENTRIES.flatMap((e) => (e.image ? [e.image.src] : [])),
}

/** The /2026/ page, built on the mirrored 2025 page. */
export function build2026(): string {
  const shell = addProgress2026(readFileSync('mirror/pages/2025-2/index.html', 'utf8'))
  const first = shell.indexOf('<div class="wp-block-group alignfull', shell.indexOf('entry-content'))
  const band = shell.lastIndexOf('<div class="wp-block-group alignfull', shell.indexOf('We do what we do thanks to support'))
  // The band is followed by an empty paragraph and the close of entry-content.
  const bandEnd = shell.indexOf('<p class="wp-block-paragraph"></p>\n</div></div>\n</main>')
  const spacer = shell.lastIndexOf('<div class="wp-block-group alignfull', band - 1)
  if ([first, band, bandEnd, spacer].includes(-1)) throw new Error('the 2025 page changed shape; update build2026')

  const firstImage = ENTRIES.find((e) => e.image)!.image!
  const body =
    shell.slice(0, first) +
    renderEntries(ENTRIES) +
    '\n\n\n\n' +
    shell.slice(spacer, band) +
    shell.slice(bandEnd)

  return (
    body
      .replaceAll('https://ruralhackers.com/2025-2/', 'https://ruralhackers.com/2026/')
      .replaceAll('https:\\/\\/ruralhackers.com\\/2025-2\\/', 'https:\\/\\/ruralhackers.com\\/2026\\/')
      .replaceAll('2025 - Rural Hackers', '2026 - Rural Hackers')
      .replace('"position":2,"name":"2025"', '"position":2,"name":"2026"')
      .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${DESCRIPTION}" />`)
      .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${DESCRIPTION}" />`)
      .replace(/<meta property="article:modified_time"[^>]*>\s*/, '')
      .replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="https://ruralhackers.com/wp-content/uploads/${firstImage.src}" />`)
      .replace(/<meta property="og:image:width" content="\d+" \/>/, `<meta property="og:image:width" content="${firstImage.width}" />`)
      .replace(/<meta property="og:image:height" content="\d+" \/>/, `<meta property="og:image:height" content="${firstImage.height}" />`)
      .replace(/<link rel='shortlink'[^>]*>\n?/, '')
      // the menu marks 2026 as the current page, not 2025
      .replace(
        '<li class="wp-block-navigation-item current-menu-item wp-block-navigation-link"><a class="wp-block-navigation-item__content"  href="/2025-2/" aria-current="page">',
        '<li class="wp-block-navigation-item wp-block-navigation-link"><a class="wp-block-navigation-item__content"  href="/2025-2/">',
      )
      .replace(
        '<li class="wp-block-navigation-item wp-block-navigation-link"><a class="wp-block-navigation-item__content"  href="/2026/">',
        '<li class="wp-block-navigation-item current-menu-item wp-block-navigation-link"><a class="wp-block-navigation-item__content"  href="/2026/" aria-current="page">',
      )
  )
}
