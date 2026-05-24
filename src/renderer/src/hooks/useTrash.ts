// src/renderer/src/hooks/useTrash.ts
import { useAppStore } from '../store/app.store'

export function useTrash() {
  const { selectedPaths, clearSelection, scanResult, setScanResult } = useAppStore()

  const trashPaths = async (paths: string[]) => {
    if (paths.length === 0) return { failed: [] }
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
    return { failed: Array.from(failed) }
  }

  const trashSelected = async () => {
    if (selectedPaths.size === 0) return
    const result = await trashPaths(Array.from(selectedPaths))
    clearSelection()
    return result
  }

  return { trashSelected, trashPaths, selectedCount: selectedPaths.size }
}
