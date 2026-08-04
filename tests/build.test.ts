import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'

describe('build output', () => {
  it('emits the front page at dist/index.html', () => {
    // `bun run build` must have run first; this asserts the artefact, which is
    // what Netlify publishes.
    expect(existsSync('dist/index.html')).toBe(true)
  })
})
