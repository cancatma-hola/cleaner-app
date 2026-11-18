// electron/workers/file-scanner.worker.ts
import { workerData, parentPort } from 'worker_threads'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { minimatch } from 'minimatch'
import type { ScannedFile, Category } from '../../src/renderer/src/types'

const SYSTEM_DIRS = new Set(['/System', '/Library', '/usr', '/bin', '/sbin', '/private'])

export function shouldSkip(name: string, fullPath: string, excludePatterns: string[], includeHidden = false): boolean {
  if (!includeHidden && name.startsWith('.')) return true
  return excludePatterns.some((p) => {
    const stripped = p.replace(/^\*\*\//, '').replace(/\/\*\*$/, '')
    // Single-level pattern (e.g. node_modules) → match by name only
    if (!stripped.includes('/')) return minimatch(name, stripped)
    // Multi-level pattern (e.g. **/Library/Caches/**) → match against full path
    return minimatch(fullPath, p)
  })
}

export function categorize(name: string, dir: string): Category {
  const lower = name.toLowerCase()
  const lowerDir = dir.toLowerCase()
  if (lower.match(/screenshot/) || lowerDir.includes('screenshot')) return 'screenshot'
  if (lowerDir.includes('download')) return 'download'
  if (lower.match(/\.(zip|tar\.gz|tar\.bz2|7z|rar|dmg|bak)$/)) return 'backup'
  if (lower.match(/\.(mp4|mov|avi|mkv|m4v|wmv)$/)) return 'video'
  if (lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|pages|numbers|key)$/)) return 'document'
  if (lower.match(/\.(png|jpg|jpeg|gif|webp|heic|svg|bmp)$/)) return 'screenshot'
  return 'other'
}

export async function scanDirectory(
  rootPath: string,
  opts: { excludePatterns: string[]; includeHidden: boolean },
): Promise<ScannedFile[]> {
  const results: ScannedFile[] = []

  const walk = (dir: string) => {
    if (SYSTEM_DIRS.has(dir)) return
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }

    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (shouldSkip(entry.name, full, opts.excludePatterns, opts.includeHidden)) continue
      if (entry.isFile()) {
        try {
          const s = statSync(full)
          results.push({
            path: full,
            name: entry.name,
            size: s.size,
            lastAccessed: s.atimeMs,
            lastModified: s.mtimeMs,
            created: s.birthtimeMs,
            category: categorize(entry.name, dir),
          })
          if (results.length % 50 === 0) {
            parentPort?.postMessage({ type: 'progress', scanned: results.length, currentPath: full })
          }
        } catch { /* skip unreadable */ }
      } else if (entry.isDirectory()) {
        walk(full)
      }
    }
  }

  walk(rootPath)
  parentPort?.postMessage({ type: 'progress', scanned: results.length, currentPath: rootPath })
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
