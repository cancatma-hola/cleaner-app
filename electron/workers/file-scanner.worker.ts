// electron/workers/file-scanner.worker.ts
import { workerData, parentPort } from 'worker_threads'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { minimatch } from 'minimatch'
import type { ScannedFile, Category } from '../../src/renderer/src/types'

const SYSTEM_DIRS = new Set(['/System', '/Library', '/usr', '/bin', '/sbin', '/private'])

export function shouldSkip(name: string, excludePatterns: string[], includeHidden = false): boolean {
  if (!includeHidden && name.startsWith('.')) return true
  return excludePatterns.some((p) => {
    // Match the bare name against the stripped pattern (e.g. node_modules/** → node_modules)
    const stripped = p.replace(/^\*\*\//, '').replace(/\/\*\*$/, '')
    return minimatch(name, stripped) || minimatch(name, p)
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
      if (shouldSkip(entry.name, opts.excludePatterns, opts.includeHidden)) continue
      const full = join(dir, entry.name)
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
          if (results.length % 100 === 0) {
            parentPort?.postMessage({ type: 'progress', scanned: results.length, currentPath: full })
          }
        } catch { /* skip unreadable */ }
      } else if (entry.isDirectory()) {
        walk(full)
      }
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
