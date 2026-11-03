// src/renderer/src/components/ActionBar.tsx
import { formatBytes } from '../utils/format'
import { useAppStore } from '../store/app.store'
import { useTrash } from '../hooks/useTrash'
import { LABELS } from '../utils/platform'


interface ActionBarProps {
  files: { path: string; size: number }[]
}

export function ActionBar({ files }: ActionBarProps) {
  const { selectedPaths, clearSelection, trashProgress } = useAppStore()
  const { trashSelected } = useTrash()

  const selectedFiles = files.filter((f) => selectedPaths.has(f.path))
  const totalBytes = selectedFiles.reduce((s, f) => s + f.size, 0)

  if (trashProgress) {
    const pct = Math.round((trashProgress.done / trashProgress.total) * 100)
    return (
      <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-5 py-3 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-red-400 font-medium">
            {LABELS.trashProgress} — {trashProgress.done.toLocaleString('tr-TR')} / {trashProgress.total.toLocaleString('tr-TR')} dosya
          </span>
          <span className="text-[11px] text-red-300 font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden mb-1">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
        {trashProgress.failed > 0 && (
          <div className="text-[9px] text-amber-400">{trashProgress.failed} dosya taşınamadı</div>
        )}
      </div>
    )
  }

  if (selectedPaths.size === 0) return null

  return (
    <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-5 py-3 flex items-center gap-3 shrink-0">
      <span className="text-[11px] text-[#888]">
        {selectedPaths.size} dosya seçili —{' '}
        <span className="text-red-400 font-semibold">{formatBytes(totalBytes)}</span> boşalacak
      </span>
      <div className="flex-1" />
      <button
        onClick={clearSelection}
        className="px-3 py-1.5 bg-[#1e1e1e] rounded text-[11px] text-[#888] hover:text-white transition"
      >
        Seçimi Temizle
      </button>
      <button
        onClick={trashSelected}
        className="px-3 py-1.5 bg-red-500 rounded text-[11px] text-white font-semibold hover:bg-red-600 transition"
      >
        {LABELS.trashAction} ({formatBytes(totalBytes)})
      </button>
    </div>
  )
}
