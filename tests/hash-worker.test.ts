// tests/hash-worker.test.ts
import { describe, it, expect } from 'vitest'
import { hashFile, groupDuplicates } from '../electron/workers/hash.worker'
import { writeFileSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { ScannedFile } from '../src/renderer/src/types'

describe('hashFile', () => {
  it('returns same hash for identical content', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hash-test-'))
    const content = 'identical content'
    writeFileSync(join(dir, 'a.txt'), content)
    writeFileSync(join(dir, 'b.txt'), content)
    const hashA = await hashFile(join(dir, 'a.txt'))
    const hashB = await hashFile(join(dir, 'b.txt'))
    expect(hashA).toBe(hashB)
  })

  it('returns different hash for different content', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hash-test-'))
    writeFileSync(join(dir, 'a.txt'), 'content A')
    writeFileSync(join(dir, 'b.txt'), 'content B')
    const hashA = await hashFile(join(dir, 'a.txt'))
    const hashB = await hashFile(join(dir, 'b.txt'))
    expect(hashA).not.toBe(hashB)
  })
})

describe('groupDuplicates', () => {
  it('groups files with same hash, marks oldest as original', () => {
    const files: ScannedFile[] = [
      { path: '/a.txt', name: 'a.txt', size: 100, lastAccessed: 0, lastModified: 1000, created: 1000, category: 'document', duplicateGroup: 'hash1' },
      { path: '/b.txt', name: 'b.txt', size: 100, lastAccessed: 0, lastModified: 2000, created: 2000, category: 'document', duplicateGroup: 'hash1' },
    ]
    const groups = groupDuplicates(files)
    expect(groups).toHaveLength(1)
    expect(groups[0].files.find((f) => f.isOriginal)?.path).toBe('/a.txt')
    expect(groups[0].wastedBytes).toBe(100)
  })

  it('ignores files without duplicateGroup', () => {
    const files: ScannedFile[] = [
      { path: '/a.txt', name: 'a.txt', size: 100, lastAccessed: 0, lastModified: 0, created: 0, category: 'document' },
    ]
    expect(groupDuplicates(files)).toHaveLength(0)
  })
})
