// src/main/services/disk-info.ts
import { statfs, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import type { DiskInfo, Category } from '../../renderer/src/types'
import { categorize } from './categorize'
import { isWin, isMac, systemVolumeRoot } from '../platform'

export { categorize }

const SKIP_DIRS = new Set(['node_modules', '.git', 'Library', 'AppData'])

export async function getDiskInfo(): Promise<DiskInfo> {
  // fs.statfs is cross-platform (GetDiskFreeSpaceEx on Windows) — no `df` dependency.
  const s = await statfs(systemVolumeRoot())
  const total = s.blocks * s.bsize
  const free = s.bavail * s.bsize
  const used = total - free

  const byCategory = await getCategoryBreakdown()

  return { total, used, free, byCategory }
}

function topDirs(): string[] {
  if (isWin) return ['Downloads', 'Desktop', 'Documents', 'Videos', 'Pictures', 'Music']
  if (isMac) return ['Downloads', 'Desktop', 'Documents', 'Movies', 'Pictures']
  return ['Downloads', 'Desktop', 'Documents', 'Videos', 'Pictures']
}

async function getCategoryBreakdown(): Promise<Record<Category, number>> {
  const home = homedir()
  const result: Record<Category, number> = {
    screenshot: 0, download: 0, backup: 0,
    cache: 0, video: 0, document: 0, other: 0,
  }

  const scanDir = async (dir: string): Promise<void> => {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isFile()) {
        try {
          const st = await stat(full)
          result[categorize(entry.name, dir)] += st.size
        } catch { /* skip */ }
      } else if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
        await scanDir(full)
      }
      // symlinks / junctions are not followed
    }
  }

  await Promise.all(topDirs().map((d) => scanDir(join(home, d))))
  return result
}
