// src/renderer/src/pages/UnusedFiles.tsx
import { formatBytes } from '../utils/format'
import { useState } from 'react'
import { useAppStore } from '../store/app.store'
import { useTrash } from '../hooks/useTrash'
import { ActionBar } from '../components/ActionBar'
import { PreviewPanel } from '../components/PreviewPanel'
import type { ScannedFile } from '../types'
import { parentDir } from '../utils/platform'

const DAYS_FILTERS = [30, 90, 180, 365] as const
const CATEGORIES = ['download', 'screenshot', 'backup', 'document', 'video', 'other'] as const


export function UnusedFiles() {
  const { scanResult, selectedPaths, toggleSelect, selectPaths, deselectPaths } = useAppStore()
  const { trashPaths } = useTrash()
  const [daysFilter, setDaysFilter] = useState<number>(90)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<ScannedFile | null>(null)
  const [sortBy, setSortBy] = useState<'size' | 'date'>('size')

  if (!scanResult) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#555] text-[13px]">
        Henüz tarama yapılmadı. Dashboard'dan taramayı başlatın.
      </div>
    )
  }

  const thresholdMs = daysFilter * 24 * 60 * 60 * 1000
  let files = scanResult.unused.filter((f) => Date.now() - f.lastAccessed > thresholdMs)
  if (categoryFilter) files = files.filter((f) => f.category === categoryFilter)
  files = [...files].sort((a, b) =>
    sortBy === 'size' ? b.size - a.size : a.lastAccessed - b.lastAccessed
  )

  const categoryCounts = CATEGORIES.reduce((acc, c) => {
    acc[c] = scanResult.unused.filter((f) => f.category === c).length
    return acc
  }, {} as Record<string, number>)

  const allFilteredPaths = files.map((f) => f.path)
  const allSelected = allFilteredPaths.length > 0 && allFilteredPaths.every((p) => selectedPaths.has(p))
  const someSelected = !allSelected && allFilteredPaths.some((p) => selectedPaths.has(p))

  function toggleSelectAll() {
    if (allSelected) deselectPaths(allFilteredPaths)
    else selectPaths(allFilteredPaths)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center gap-3 shrink-0">
        <span className="text-[13px] font-semibold">Kullanılmayan Dosyalar</span>
        <span className="bg-[#1e1e1e] text-[#888] text-[10px] px-2 py-0.5 rounded">{files.length} dosya</span>
        <div className="flex-1" />
        {DAYS_FILTERS.map((d) => (
          <button
            key={d}
            onClick={() => setDaysFilter(d)}
            className={`px-2 py-0.5 rounded text-[10px] transition ${daysFilter === d ? 'bg-[#1e3a5f] text-blue-400' : 'bg-[#1e1e1e] text-[#666] hover:text-white'}`}
          >
            {d}+ gün
          </button>
        ))}
        <button
          onClick={() => setSortBy(sortBy === 'size' ? 'date' : 'size')}
          className="px-2 py-0.5 bg-[#1e1e1e] rounded text-[10px] text-[#888] hover:text-white transition"
        >
          {sortBy === 'size' ? 'Boyut ▾' : 'Tarih ▾'}
        </button>
      </div>

      {/* Category chips */}
      <div className="px-5 py-2 border-b border-[#1e1e1e] flex gap-2 overflow-x-auto shrink-0">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-[10px] transition ${!categoryFilter ? 'bg-[#1e3a5f] text-blue-400' : 'bg-[#1e1e1e] text-[#888] hover:text-white'}`}
        >
          Tümü <span className="ml-1 opacity-60">{scanResult.unused.length}</span>
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] transition ${categoryFilter === c ? 'bg-[#1e3a5f] text-blue-400' : 'bg-[#1e1e1e] text-[#666] hover:text-white'}`}
          >
            {c} <span className="ml-1 opacity-60">{categoryCounts[c]}</span>
          </button>
        ))}
      </div>

      {/* List + Preview */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[28px_1fr_80px_100px_60px] gap-2 px-5 py-2 text-[9px] font-bold text-[#555] uppercase tracking-wider border-b border-[#161616] sticky top-0 bg-[#0a0a0a]">
            <div
              onClick={toggleSelectAll}
              title={allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[8px] cursor-pointer shrink-0 transition-colors
                ${allSelected ? 'bg-blue-500 border-blue-500 text-white' : someSelected ? 'bg-blue-500/40 border-blue-500 text-white' : 'border-[#444] hover:border-[#888]'}`}
            >
              {allSelected ? '✓' : someSelected ? '—' : ''}
            </div>
            <span>Dosya Adı</span><span>Boyut</span><span>Son Erişim</span><span>Tür</span>
          </div>
          {files.map((file) => {
            const isSelected = selectedPaths.has(file.path)
            const daysSince = Math.round((Date.now() - file.lastAccessed) / 86400000)
            const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.') + 1).toUpperCase() : '—'
            return (
              <div
                key={file.path}
                onClick={() => setPreviewFile(file)}
                className={`grid grid-cols-[28px_1fr_80px_100px_60px] gap-2 px-5 py-2.5 border-b border-[#161616] items-center cursor-pointer transition-colors
                  ${previewFile?.path === file.path ? 'bg-[#1a1a2e]' : 'hover:bg-[#111]'}
                  ${isSelected ? 'bg-[#0f1f2f]' : ''}`}
              >
                <div
                  onClick={(e) => { e.stopPropagation(); toggleSelect(file.path) }}
                  className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[8px] cursor-pointer shrink-0
                    ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-[#333] hover:border-[#555]'}`}
                >
                  {isSelected && '✓'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-[11px] text-white truncate">{file.name}</div>
                  <div className="text-[9px] text-[#555] truncate">{parentDir(file.path)}</div>
                </div>
                <div className={`text-[11px] ${file.size > 1e9 ? 'text-red-400' : file.size > 1e8 ? 'text-amber-400' : 'text-[#888]'}`}>
                  {formatBytes(file.size)}
                </div>
                <div className="text-[11px] text-[#666]">{daysSince} gün önce</div>
                <div className="text-[9px] text-[#888] bg-[#1e1e1e] px-1.5 py-0.5 rounded text-center truncate">{ext}</div>
              </div>
            )
          })}
          {files.length === 0 && (
            <div className="flex items-center justify-center h-32 text-[#555] text-[12px]">
              Bu filtrelerle eşleşen dosya bulunamadı.
            </div>
          )}
        </div>
        {previewFile && (
          <PreviewPanel
            file={previewFile}
            onTrash={async () => {
              await trashPaths([previewFile.path])
              setPreviewFile(null)
            }}
          />
        )}
      </div>
      <ActionBar files={files} />
    </div>
  )
}
