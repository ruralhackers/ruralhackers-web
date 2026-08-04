import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Comments are stripped before asserting. The file documents *why* accent-2 and
 * accent-3 were dropped, which means naming their hex values — and a raw
 * substring check would then fail on its own explanation.
 */
const css = readFileSync('src/styles/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('tokens.css', () => {
  it('carries the five colours the live site actually uses', () => {
    expect(css).toContain('--color-base: #FFFFFF')
    expect(css).toContain('--color-contrast: #111111')
    expect(css).toContain('--color-accent-1: #e56529')
    expect(css).toContain('--color-accent-4: #686868')
    expect(css).toContain('--color-accent-5: #eeeeee')
  })

  it('omits the two palette entries nothing references', () => {
    // The purple and teal accents exist in the wordpress palette but no element
    // style and no content class uses them. Approved for removal.
    expect(css).not.toContain('--color-accent-2')
    expect(css).not.toContain('--color-accent-3')
    expect(css).not.toContain('4c1f7a')
    expect(css).not.toContain('219b9d')
  })

  it('reproduces the fluid type scale verbatim', () => {
    expect(css).toContain('--size-small: 0.875rem')
    expect(css).toContain(
      '--size-medium: clamp(1rem, 1rem + ((1vw - 0.2rem) * 0.196), 1.125rem)',
    )
    expect(css).toContain(
      '--size-xx-large: clamp(2.15rem, 2.15rem + ((1vw - 0.2rem) * 1.333), 3rem)',
    )
  })

  it('reproduces the spacing scale, which is clamp-based above step 40', () => {
    expect(css).toContain('--space-30: 20px')
    expect(css).toContain('--space-50: clamp(30px, 5vw, 50px)')
    expect(css).toContain('--space-80: clamp(70px, 10vw, 140px)')
  })

  it('keeps the two layout widths the theme constrains to', () => {
    expect(css).toContain('--content-size: 645px')
    expect(css).toContain('--wide-size: 1340px')
  })
})
