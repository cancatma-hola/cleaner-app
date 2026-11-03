// src/renderer/src/utils/platform.ts
// Platform-aware labels and path helpers for the renderer.
const platform: string = typeof window !== 'undefined' && window.cleaner ? window.cleaner.platform : 'darwin'

export const isWin = platform === 'win32'
export const isMac = platform === 'darwin'

export const LABELS = {
  revealInFileManager: isWin ? "Gezgin'de Göster" : isMac ? "Finder'da Göster" : 'Klasörde Göster',
  trashAction: isWin ? 'Geri Dönüşüm Kutusuna Taşı' : 'Çöpe Taşı',
  trashActionShort: isWin ? 'Sil' : 'Çöpe Taşı',
  trashSelected: isWin ? 'Seçilenleri Geri Dönüşüm Kutusuna Taşı' : 'Seçilenleri Çöpe Taşı',
  trashProgress: isWin ? 'Geri Dönüşüm Kutusuna taşınıyor' : 'Çöpe taşınıyor',
  notifications: isMac ? 'macOS Bildirimleri' : 'Masaüstü Bildirimleri',
  pathPlaceholder: isWin ? 'C:\\Users\\kullanici\\Documents' : '/Users/kullanici/Documents',
}

/** Parent folder of a path, for both "/" and "\\" separators. */
export function parentDir(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i > 0 ? p.slice(0, i) : p
}

/** Absolute path check: "/x", "C:\\x", "C:/x" or UNC "\\\\server\\share". */
export function isAbsolutePath(p: string): boolean {
  return p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('\\\\')
}

/** URL for a local image preview, served by the main process' image-only scheme. */
export function previewUrl(p: string): string {
  return `cleaner-file://img/?p=${encodeURIComponent(p)}`
}
