// tests/system-clean.test.ts
import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, utimesSync, symlinkSync } from 'fs'
import { join, parse } from 'path'
import { tmpdir, homedir } from 'os'
import { processRoot, isSafeRoot, isInside } from '../src/main/services/system-clean'

const DAY = 24 * 60 * 60 * 1000

function sandbox(): string {
  return mkdtempSync(join(tmpdir(), 'sysclean-test-'))
}

function old(p: string, days = 3) {
  const t = new Date(Date.now() - days * DAY)
  utimesSync(p, t, t)
}

describe('isSafeRoot', () => {
  it('rejects drive/filesystem root, home and its parent', () => {
    expect(isSafeRoot(parse(homedir()).root)).toBe(false)
    expect(isSafeRoot(homedir())).toBe(false)
    expect(isSafeRoot(join(homedir(), '..'))).toBe(false)
  })
  it('rejects relative paths', () => {
    expect(isSafeRoot('Temp')).toBe(false)
  })
  it('accepts a nested cache folder', () => {
    expect(isSafeRoot(join(tmpdir(), 'some-cache'))).toBe(true)
  })
  it.runIf(process.platform === 'win32')('rejects Windows system folders', () => {
    expect(isSafeRoot('C:\\Windows')).toBe(false)
    expect(isSafeRoot('c:\\program files')).toBe(false)
    expect(isSafeRoot(join(homedir(), 'AppData', 'Local'))).toBe(false)
    expect(isSafeRoot('C:\\Windows\\Temp')).toBe(true)
  })
})

describe('isInside', () => {
  it('detects children and rejects escapes', () => {
    const root = join(tmpdir(), 'r')
    expect(isInside(root, join(root, 'a', 'b'))).toBe(true)
    expect(isInside(root, root)).toBe(false)
    expect(isInside(root, join(root, '..', 'other'))).toBe(false)
  })
})

describe('processRoot', () => {
  it('dry run measures but deletes nothing', async () => {
    const dir = sandbox()
    writeFileSync(join(dir, 'a.tmp'), 'x'.repeat(100))
    mkdirSync(join(dir, 'sub'))
    writeFileSync(join(dir, 'sub', 'b.tmp'), 'y'.repeat(50))

    const s = await processRoot(dir, { minAgeMs: 0, dryRun: true })
    expect(s.files).toBe(2)
    expect(s.bytes).toBe(150)
    expect(s.deleted).toBe(0)
    expect(existsSync(join(dir, 'a.tmp'))).toBe(true)
  })

  it('deletes contents (files + emptied folders) but keeps the root', async () => {
    const dir = sandbox()
    writeFileSync(join(dir, 'a.tmp'), 'x'.repeat(100))
    mkdirSync(join(dir, 'sub', 'deep'), { recursive: true })
    writeFileSync(join(dir, 'sub', 'deep', 'b.tmp'), 'y'.repeat(50))

    const s = await processRoot(dir, { minAgeMs: 0, dryRun: false })
    expect(s.deleted).toBe(2)
    expect(s.freedBytes).toBe(150)
    expect(existsSync(dir)).toBe(true)
    expect(existsSync(join(dir, 'sub'))).toBe(false)
  })

  it('keeps files younger than minAge (and their folders)', async () => {
    const dir = sandbox()
    writeFileSync(join(dir, 'old.tmp'), 'old')
    old(join(dir, 'old.tmp'))
    mkdirSync(join(dir, 'busy'))
    writeFileSync(join(dir, 'busy', 'new.tmp'), 'new')

    // birthtime can't be back-dated, so evaluate "now" two days ahead and push the
    // busy file's mtime to that moment: old.tmp is then 2 days old, new.tmp 0 days.
    const later = Date.now() + 2 * DAY
    utimesSync(join(dir, 'busy', 'new.tmp'), new Date(later), new Date(later))
    const s = await processRoot(dir, { minAgeMs: DAY, dryRun: false, now: later })
    expect(s.deleted).toBe(1)
    expect(s.skippedYoung).toBe(1)
    expect(existsSync(join(dir, 'old.tmp'))).toBe(false)
    expect(existsSync(join(dir, 'busy', 'new.tmp'))).toBe(true)
  })

  it('keeps freshly created empty folders when minAge is set', async () => {
    const dir = sandbox()
    mkdirSync(join(dir, 'just-created'))
    const s = await processRoot(dir, { minAgeMs: DAY, dryRun: false })
    expect(s.deleted).toBe(0)
    expect(existsSync(join(dir, 'just-created'))).toBe(true)
  })

  it('never follows a junction/symlink out of the root', async () => {
    const outside = sandbox()
    writeFileSync(join(outside, 'precious.txt'), 'do not delete')
    const dir = sandbox()
    // 'junction' works without admin rights on Windows; ignored on other platforms
    symlinkSync(outside, join(dir, 'link'), 'junction')

    const s = await processRoot(dir, { minAgeMs: 0, dryRun: false })
    expect(s.deleted).toBe(0)
    expect(existsSync(join(outside, 'precious.txt'))).toBe(true)
    expect(existsSync(join(dir, 'link'))).toBe(true)
  })

  it('keeps desktop.ini folder config', async () => {
    const dir = sandbox()
    writeFileSync(join(dir, 'desktop.ini'), '[.ShellClassInfo]')
    const s = await processRoot(dir, { minAgeMs: 0, dryRun: false })
    expect(s.deleted).toBe(0)
    expect(existsSync(join(dir, 'desktop.ini'))).toBe(true)
  })

  it('refuses unsafe roots', async () => {
    await expect(processRoot(homedir(), { minAgeMs: 0, dryRun: true })).rejects.toThrow()
  })
})
