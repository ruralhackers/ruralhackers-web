import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

/**
 * The parts of the archive that git does not hold, because of their size. These
 * are exactly the parts that cannot be regenerated once ruralhackers.com stops
 * serving.
 */
export const UNVERSIONED_DIRS = ['media', 'screenshots', 'pages-full'] as const

export interface ChecksumEntry {
  path: string
  sha256: string
  bytes: number
}

/**
 * Standard `sha256sum` format: `<hash>  <path>`, two spaces. Written in that
 * format deliberately so the backup can be verified years from now with
 * `sha256sum -c`, needing nothing from this repo.
 */
export function formatChecksumFile(entries: readonly ChecksumEntry[]): string {
  return entries.map((e) => `${e.sha256}  ${e.path}`).join('\n') + '\n'
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else out.push(p)
  }
  return out
}

function hashFile(path: string): Promise<{ sha256: string; bytes: number }> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    let bytes = 0
    createReadStream(path)
      .on('data', (chunk) => {
        bytes += chunk.length
        hash.update(chunk)
      })
      .on('error', reject)
      .on('end', () => resolve({ sha256: hash.digest('hex'), bytes }))
  })
}

export async function writeChecksums(outDir: string): Promise<{ path: string; count: number; bytes: number }> {
  const entries: ChecksumEntry[] = []
  for (const sub of UNVERSIONED_DIRS) {
    for (const file of await walk(join(outDir, sub))) {
      const { sha256, bytes } = await hashFile(file)
      entries.push({ path: relative(outDir, file), sha256, bytes })
    }
  }
  entries.sort((a, b) => a.path.localeCompare(b.path))

  const path = join(outDir, 'reports', 'checksums.sha256')
  await mkdir(join(outDir, 'reports'), { recursive: true })
  await writeFile(path, formatChecksumFile(entries), 'utf8')
  return { path, count: entries.length, bytes: entries.reduce((n, e) => n + e.bytes, 0) }
}
