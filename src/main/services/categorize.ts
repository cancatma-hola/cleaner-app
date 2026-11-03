// src/main/services/categorize.ts
// Shared by disk-info (main) and the file-scanner worker.
import type { Category } from '../../renderer/src/types'

// English + Turkish screenshot names (macOS "Ekran Resmi", Windows "Ekran görüntüsü" / "Ekran Görüntüleri")
const SCREENSHOT_RE = /screenshot|ekran resmi|ekran g[öo]r[üu]nt[üu]s[üu]|ekran g[öo]r[üu]nt[üu]leri/

export function categorize(name: string, dir: string): Category {
  const lower = name.toLowerCase()
  const lowerDir = dir.toLowerCase()
  if (SCREENSHOT_RE.test(lower) || SCREENSHOT_RE.test(lowerDir)) return 'screenshot'
  if (lowerDir.includes('download') || lowerDir.includes('indirilenler')) return 'download'
  if (lower.match(/\.(zip|tar\.gz|tar\.bz2|7z|rar|dmg|iso|bak)$/)) return 'backup'
  if (lower.match(/\.(mp4|mov|avi|mkv|m4v|wmv|webm)$/)) return 'video'
  if (lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|pages|numbers|key)$/)) return 'document'
  if (lower.match(/\.(png|jpg|jpeg|gif|webp|heic|svg|bmp)$/)) return 'screenshot'
  return 'other'
}
