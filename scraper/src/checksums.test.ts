import { describe, it, expect } from 'vitest'
import { formatChecksumFile, UNVERSIONED_DIRS, type ChecksumEntry } from './checksums.ts'

const entry = (path: string, sha256: string): ChecksumEntry => ({ path, sha256, bytes: 1 })

describe('formatChecksumFile', () => {
  it('uses the two-space sha256sum format so `sha256sum -c` accepts it', () => {
    const out = formatChecksumFile([
      entry('media/uploads/2026/06/a.jpeg', 'a'.repeat(64)),
      entry('screenshots/index.desktop.png', 'b'.repeat(64)),
    ])
    expect(out).toBe(
      `${'a'.repeat(64)}  media/uploads/2026/06/a.jpeg\n` +
        `${'b'.repeat(64)}  screenshots/index.desktop.png\n`,
    )
  })

  it('ends with a trailing newline, which sha256sum expects', () => {
    expect(formatChecksumFile([entry('x', 'c'.repeat(64))]).endsWith('\n')).toBe(true)
  })

  it('produces just a newline for an empty set rather than an empty file', () => {
    expect(formatChecksumFile([])).toBe('\n')
  })
})

describe('UNVERSIONED_DIRS', () => {
  it('covers exactly the gitignored archive subtrees', () => {
    // If .gitignore and this list drift apart, something irreplaceable stops
    // being checksummed while still looking backed up.
    expect([...UNVERSIONED_DIRS]).toEqual(['media', 'screenshots', 'pages-full'])
  })
})
