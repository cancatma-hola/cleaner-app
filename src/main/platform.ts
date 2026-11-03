// src/main/platform.ts
// Platform-specific defaults (macOS / Windows / Linux) — main process only.
import { homedir } from 'os'
import { join, parse } from 'path'
import { execFile } from 'child_process'
import type { AppSettings, ScanConfig, SystemInfo } from '../renderer/src/types'
import { DEFAULT_SETTINGS } from '../renderer/src/types'

export const isWin = process.platform === 'win32'
export const isMac = process.platform === 'darwin'

const COMMON_EXCLUDES = ['**/node_modules/**', '**/.git/**']

// Windows: never surface registry hives, page/hibernate files, cloud-sync roots or app data
// in the user-facing "unused / large / duplicate" lists. OneDrive is excluded because reading
// "files on demand" placeholders (hashing) would force-download them from the cloud.
export const WINDOWS_EXCLUDES = [
  ...COMMON_EXCLUDES,
  '**/AppData/**',
  '**/OneDrive*/**',
  '**/$Recycle.Bin/**',
  '**/System Volume Information/**',
  'NTUSER.DAT*',
  'ntuser.*',
  'desktop.ini',
  'pagefile.sys',
  'hiberfil.sys',
  'swapfile.sys',
]

export const MAC_EXCLUDES = [...COMMON_EXCLUDES, '**/Library/Caches/**']
export const LINUX_EXCLUDES = [...COMMON_EXCLUDES, '**/.cache/**']

export function defaultScanPaths(): string[] {
  return isMac ? ['/Users'] : [homedir()]
}

export function defaultExcludePatterns(): string[] {
  if (isWin) return WINDOWS_EXCLUDES
  if (isMac) return MAC_EXCLUDES
  return LINUX_EXCLUDES
}

export function defaultScanConfig(): ScanConfig {
  return {
    ...DEFAULT_SETTINGS.scanConfig,
    paths: defaultScanPaths(),
    excludePatterns: defaultExcludePatterns(),
  }
}

export function defaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, scanConfig: defaultScanConfig() }
}

/** Root of the system volume: "C:\\" on Windows, "/" elsewhere. */
export function systemVolumeRoot(): string {
  return isWin ? parse(process.env.SystemDrive ? process.env.SystemDrive + '\\' : homedir()).root : '/'
}

export function testDir(): string {
  return join(homedir(), 'Desktop', 'cleaner-test')
}

let adminCache: boolean | null = null
export function isElevated(): Promise<boolean> {
  if (adminCache !== null) return Promise.resolve(adminCache)
  if (!isWin) {
    adminCache = typeof process.getuid === 'function' && process.getuid() === 0
    return Promise.resolve(adminCache)
  }
  // `net session` only succeeds in an elevated process.
  return new Promise((resolve) => {
    execFile('net', ['session'], { windowsHide: true }, (err) => {
      adminCache = !err
      resolve(adminCache)
    })
  })
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return {
    platform: process.platform,
    homeDir: homedir(),
    isAdmin: await isElevated(),
    defaultScanPaths: defaultScanPaths(),
    defaultExcludePatterns: defaultExcludePatterns(),
    testDir: testDir(),
  }
}
