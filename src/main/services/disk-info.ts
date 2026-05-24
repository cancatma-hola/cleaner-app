// src/main/services/disk-info.ts
import { execSync } from 'child_process'
import { statSync, readdirSync } from 'fs'
import { join } from 'path'
import type { DiskInfo, Category } from '../../renderer/src/types'

const SKIP_DIRS = new Set(['node_modules', '.git', 'Library'])

export async function getDiskInfo(): Promise<DiskInfo> {
  const dfOutput = execSync('df -k /').toString().split('\n')[1].split(/\s+/)
  const blockSize = 1024
  const total = parseInt(dfOutput[1]) * blockSize
  const free = parseInt(dfOutput[3]) * blockSize
  const used = total - free

  const byCategory = await getCategoryBreakdown()

  return { total, used, free, byCategory }
}

async function getCategoryBreakdown(): Promise<Record<Category, number>> {
  const home = process.env.HOME ?? '/Users'
  const result: Record<Category, number> = {
    screenshot: 0, download: 0, backup: 0,
    cache: 0, video: 0, document: 0, other: 0,
  }

  const scanDir = (dir: string) => {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        const full = join(dir, entry.name)
        if (entry.isFile()) {
          try {
            const stat = statSync(full)
            const cat = categorize(entry.name, dir)
            result[cat] += stat.size
          } catch { /* skip */ }
        } else if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
          scanDir(full)
        }
      }
    } catch { /* skip */ }
  }

  const TOP_DIRS = ['Downloads', 'Desktop', 'Documents', 'Movies', 'Pictures']
  for (const d of TOP_DIRS) scanDir(join(home, d))

  return result
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
