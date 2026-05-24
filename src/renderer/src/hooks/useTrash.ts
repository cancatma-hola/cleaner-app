// src/renderer/src/hooks/useTrash.ts
import { useAppStore } from '../store/app.store'

export function useTrash() {
  const { selectedPaths, clearSelection, scanResult, setScanResult } = useAppStore()

  const trashSelected = async () => {
    if (selectedPaths.size === 0) return
    const paths = Array.from(selectedPaths)
    const results = await window.cleaner.trashFiles(paths)
    const failed = new Set(results.filter((r: { success: boolean }) => !r.success).map((r: { path: string }) => r.path))
    const removed = new Set(paths.filter((p) => !failed.has(p)))

    if (scanResult) {
      setScanResult({
        ...scanResult,
        unused: scanResult.unused.filter((f) => !removed.has(f.path)),
        large: scanResult.large.filter((f) => !removed.has(f.path)),
        duplicates: scanResult.duplicates
          .map((g) => ({ ...g, files: g.files.filter((f) => !removed.has(f.path)) }))
          .filter((g) => g.files.length > 1),
      })
    }
    clearSelection()
    return { failed: Array.from(failed) }
  }

  return { trashSelected, selectedCount: selectedPaths.size }
}
