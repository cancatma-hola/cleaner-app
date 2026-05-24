// src/renderer/src/hooks/useTrash.ts
import { useAppStore } from '../store/app.store'

const BATCH_SIZE = 20

export function useTrash() {
  const { selectedPaths, clearSelection, setTrashProgress } = useAppStore()

  const trashPaths = async (paths: string[]) => {
    if (paths.length === 0) return { failed: [] }

    const total = paths.length
    let done = 0
    let failedCount = 0
    const failedPaths = new Set<string>()
    const succeededPaths: string[] = []

    setTrashProgress({ done: 0, total, failed: 0 })

    for (let i = 0; i < paths.length; i += BATCH_SIZE) {
      const batch = paths.slice(i, i + BATCH_SIZE)

      let results: { path: string; success: boolean }[]
      try {
        results = await window.cleaner.trashFiles(batch)
      } catch {
        results = batch.map((p) => ({ path: p, success: false }))
      }

      for (const r of results) {
        done++
        if (!r.success) {
          failedCount++
          failedPaths.add(r.path)
        } else {
          succeededPaths.push(r.path)
        }
      }

      setTrashProgress({ done, total, failed: failedCount })
    }

    setTrashProgress(null)

    // Remove succeeded paths from store — uses Zustand's own get/set, always fresh
    if (succeededPaths.length > 0) {
      useAppStore.getState().removePaths(succeededPaths)
    }

    return { failed: Array.from(failedPaths) }
  }

  const trashSelected = async () => {
    if (selectedPaths.size === 0) return
    const result = await trashPaths(Array.from(selectedPaths))
    clearSelection()
    return result
  }

  return { trashSelected, trashPaths, selectedCount: selectedPaths.size }
}
