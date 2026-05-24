// tests/file-scanner.test.ts
import { describe, it, expect } from 'vitest'
import { scanDirectory, shouldSkip, categorize } from '../electron/workers/file-scanner.worker'
import { mkdtempSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('shouldSkip', () => {
  it('skips node_modules', () => {
    expect(shouldSkip('node_modules', ['**/node_modules/**'])).toBe(true)
  })
  it('skips hidden files by default', () => {
    expect(shouldSkip('.DS_Store', [], false)).toBe(true)
  })
  it('allows hidden files if includeHidden', () => {
    expect(shouldSkip('.DS_Store', [], true)).toBe(false)
  })
})

describe('scanDirectory', () => {
  it('returns files with stat info', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cleaner-test-'))
    writeFileSync(join(dir, 'test.txt'), 'hello world')
    mkdirSync(join(dir, 'sub'))
    writeFileSync(join(dir, 'sub', 'nested.pdf'), 'pdf content')

    const files = await scanDirectory(dir, { excludePatterns: [], includeHidden: false })
    expect(files).toHaveLength(2)
    expect(files[0].size).toBeGreaterThan(0)
    expect(files[0].lastAccessed).toBeGreaterThan(0)
  })

  it('excludes node_modules', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cleaner-test-'))
    writeFileSync(join(dir, 'keep.txt'), 'keep')
    mkdirSync(join(dir, 'node_modules'))
    writeFileSync(join(dir, 'node_modules', 'pkg.js'), 'skip')

    const files = await scanDirectory(dir, { excludePatterns: ['**/node_modules/**'], includeHidden: false })
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('keep.txt')
  })
})
