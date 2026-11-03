// tests/file-scanner.test.ts
import { describe, it, expect } from 'vitest'
import { scanDirectory, shouldSkip, categorize, isSystemDir } from '../electron/workers/file-scanner.worker'
import { WINDOWS_EXCLUDES } from '../src/main/platform'
import { mkdtempSync, writeFileSync, mkdirSync, utimesSync } from 'fs'
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

describe('Windows support', () => {
  it('skips registry hives, AppData and OneDrive case-insensitively', () => {
    expect(shouldSkip('NTUSER.DAT', WINDOWS_EXCLUDES, false, true)).toBe(true)
    expect(shouldSkip('ntuser.dat.LOG1', WINDOWS_EXCLUDES, false, true)).toBe(true)
    expect(shouldSkip('AppData', WINDOWS_EXCLUDES, false, true)).toBe(true)
    expect(shouldSkip('OneDrive', WINDOWS_EXCLUDES, false, true)).toBe(true)
    expect(shouldSkip('OneDrive - Şirket', WINDOWS_EXCLUDES, false, true)).toBe(true)
    expect(shouldSkip('pagefile.sys', WINDOWS_EXCLUDES, false, true)).toBe(true)
    expect(shouldSkip('Documents', WINDOWS_EXCLUDES, false, true)).toBe(false)
    expect(shouldSkip('rapor.pdf', WINDOWS_EXCLUDES, false, true)).toBe(false)
  })

  it('detects Windows system folders only at a drive root', () => {
    expect(isSystemDir('C:\\Windows', 'win32')).toBe(true)
    expect(isSystemDir('D:\\Program Files (x86)', 'win32')).toBe(true)
    expect(isSystemDir('C:\\ProgramData\\', 'win32')).toBe(true)
    expect(isSystemDir('C:\\Users\\Can\\Windows', 'win32')).toBe(false)
    expect(isSystemDir('C:\\Users', 'win32')).toBe(false)
    expect(isSystemDir('/System', 'darwin')).toBe(true)
    expect(isSystemDir('/Users/x', 'darwin')).toBe(false)
  })

  it('categorizes Turkish screenshot names', () => {
    expect(categorize('Ekran görüntüsü 2026-11-03 101010.png', 'C:\\Users\\Can\\Pictures')).toBe('screenshot')
    expect(categorize('a.png', 'C:\\Users\\Can\\Pictures\\Ekran Görüntüleri')).toBe('screenshot')
    expect(categorize('Ekran Resmi 2026-01-01.png', '/Users/x/Desktop')).toBe('screenshot')
  })
})

describe('scanDirectory', () => {
  it('treats recently modified files as recently used even if atime is old', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cleaner-test-'))
    const f = join(dir, 'edited.txt')
    writeFileSync(f, 'x')
    const now = Date.now()
    utimesSync(f, new Date(now - 400 * 86400000), new Date(now))
    const [file] = await scanDirectory(dir, { excludePatterns: [], includeHidden: false })
    expect(now - file.lastAccessed).toBeLessThan(86400000)
  })

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
