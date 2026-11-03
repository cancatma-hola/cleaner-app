// electron/workers/file-scanner.worker.ts
import { workerData, parentPort } from 'worker_threads'
import { readdirSync, statSync } from 'fs'
import { join, win32 } from 'path'
import { minimatch } from 'minimatch'
import type { ScannedFile } from '../../src/renderer/src/types'
import { categorize } from '../../src/main/services/categorize'

export { categorize }

const POSIX_SYSTEM_DIRS = new Set(['/System', '/Library', '/usr', '/bin', '/sbin', '/private'])

// Top-level folders on any Windows drive that must never be walked.
const WIN_SYSTEM_DIR_NAMES = new Set([
  'windows',
  'program files',
  'program files (x86)',
  'programdata',
  '$recycle.bin',
  'system volume information',
  'recovery',
  'perflogs',
  '$windows.~bt',
  '$windows.~ws',
  '$winreagent',
  'config.msi',
])

export function isSystemDir(dir: string, platform: NodeJS.Platform = process.platform): boolean {
  if (platform !== 'win32') return POSIX_SYSTEM_DIRS.has(dir)
  const { root } = win32.parse(dir)
  const rest = dir.slice(root.length).replace(/[\\/]+$/, '')
  if (!rest || /[\\/]/.test(rest)) return false // only direct children of a drive root
  return WIN_SYSTEM_DIR_NAMES.has(rest.toLowerCase())
}

export function shouldSkip(
  name: string,
  excludePatterns: string[],
  includeHidden = false,
  nocase = process.platform === 'win32',
): boolean {
  if (!includeHidden && name.startsWith('.')) return true
  return excludePatterns.some((p) => {
    // Match the bare name against the stripped pattern (e.g. node_modules/** → node_modules)
    const stripped = p.replace(/^\*\*\//, '').replace(/\/\*\*$/, '')
    return minimatch(name, stripped, { nocase }) || minimatch(name, p, { nocase })
  })
}

export async function scanDirectory(
  rootPath: string,
  opts: { excludePatterns: string[]; includeHidden: boolean },
): Promise<ScannedFile[]> {
  const results: ScannedFile[] = []

  const walk = (dir: string) => {
    if (isSystemDir(dir)) return
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }

    for (const entry of entries) {
      if (shouldSkip(entry.name, opts.excludePatterns, opts.includeHidden)) continue
      const full = join(dir, entry.name)
      if (entry.isFile()) {
        try {
          const s = statSync(full)
          results.push({
            path: full,
            name: entry.name,
            size: s.size,
            // atime alone is unreliable (NTFS / APFS update it lazily or not at all);
            // a file modified recently is never "unused".
            lastAccessed: Math.max(s.atimeMs, s.mtimeMs),
            lastModified: s.mtimeMs,
            created: s.birthtimeMs,
            category: categorize(entry.name, dir),
          })
          if (results.length % 100 === 0) {
            parentPort?.postMessage({ type: 'progress', scanned: results.length, currentPath: full })
          }
        } catch { /* skip unreadable */ }
      } else if (entry.isDirectory()) {
        walk(full)
      }
      // Symlinks and Windows junctions (e.g. "Application Data") are intentionally not followed.
    }
  }

  walk(rootPath)
  return results
}

// Worker thread entry point
if (workerData) {
  const { paths, excludePatterns, includeHidden } = workerData
  Promise.all(paths.map((p: string) => scanDirectory(p, { excludePatterns, includeHidden })))
    .then((results) => {
      const files = results.flat()
      parentPort?.postMessage({ type: 'result', files })
    })
    .catch((err) => parentPort?.postMessage({ type: 'error', error: err.message }))
}
