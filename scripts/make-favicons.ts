/**
 * Generates the favicon set from the site logo into public/.
 *
 * The live site serves `cropped-RH_LOGO_NO-TEXT` at 32, 180, 192 and 270 — the same
 * 512x512 mark already imported as src/assets/logo.png — so the sizes are derived
 * rather than re-downloaded.
 *
 * public/ and not src/assets/, because these are referenced from <head> at fixed
 * paths and must not be fingerprinted: a browser looking for /favicon.ico will not
 * find /_astro/favicon.abc123.ico.
 *
 * Run: bun scripts/make-favicons.ts
 */
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const SRC = 'src/assets/logo.png'
const OUT = 'public'

/** name -> edge length, matching what the live site links. */
const SIZES: ReadonlyArray<readonly [string, number]> = [
  ['favicon-32x32.png', 32],
  ['favicon-192x192.png', 192],
  ['apple-touch-icon.png', 180],
  ['mstile-270x270.png', 270],
]

await mkdir(OUT, { recursive: true })

for (const [name, size] of SIZES) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(`${OUT}/${name}`)
  console.log(`  ${name} (${size}x${size})`)
}

// A 32px ICO as well, for anything that still asks for /favicon.ico by convention.
await sharp(SRC).resize(32, 32).png().toFile(`${OUT}/favicon.png`)
console.log('  favicon.png (32x32)')
