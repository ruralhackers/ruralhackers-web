import { describe, it, expect } from 'vitest'
import { snapshotTargets } from './snapshot.ts'

describe('snapshotTargets', () => {
  it('keeps pages and posts', () => {
    const targets = snapshotTargets([
      { loc: 'https://ruralhackers.com/', source: 'page' },
      { loc: 'https://ruralhackers.com/hacker-days/', source: 'page' },
      { loc: 'https://ruralhackers.com/speakers-at-festival-creativa/', source: 'post' },
      // The page titled "2026", served at a wordpress slug collision.
      { loc: 'https://ruralhackers.com/2025-2-2/', source: 'page' },
    ])
    expect(targets.map((t) => t.archivePath)).toEqual([
      'index',
      'hacker-days',
      'speakers-at-festival-creativa',
      '2025-2-2',
    ])
  })

  it('keeps taxonomy and author archives too, since phase 2 must redirect them', () => {
    const targets = snapshotTargets([
      { loc: 'https://ruralhackers.com/category/uncategorized-en/', source: 'category' },
      { loc: 'https://ruralhackers.com/author/nacho/', source: 'author' },
    ])
    expect(targets.map((t) => t.archivePath)).toEqual([
      'category/uncategorized-en',
      'author/nacho',
    ])
  })

  it('deduplicates repeated locations', () => {
    const targets = snapshotTargets([
      { loc: 'https://ruralhackers.com/about/', source: 'page' },
      { loc: 'https://ruralhackers.com/about/', source: 'page' },
    ])
    expect(targets).toHaveLength(1)
  })
})
