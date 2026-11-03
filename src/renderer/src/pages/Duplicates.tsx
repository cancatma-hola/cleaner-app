// src/renderer/src/pages/Duplicates.tsx
import { formatBytes } from '../utils/format'
import { useState } from 'react'
import { useAppStore } from '../store/app.store'
import { useTrash } from '../hooks/useTrash'
import type { DuplicateGroup } from '../types'
import { LABELS, parentDir } from '../utils/platform'

const MIN_WASTED_OPTIONS = [
  { label: 'Tümü', value: 0 },
  { label: '10MB+', value: 10 * 1e6 },
  { label: '100MB+', value: 100 * 1e6 },
  { label: '500MB+', value: 500 * 1e6 },
]

export function Duplicates() {
  const { scanResult, selectedPaths, toggleSelect, trashProgress } = useAppStore()
  const { trashSelected } = useTrash()
  const [minWasted, setMinWasted] = useState(0)
  const [sortBy, setSortBy] = useState<'wasted' | 'count' | 'size'>('wasted')

  if (!scanResult) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#555] text-[13px]">
        Henüz tarama yapılmadı. Dashboard'dan taramayı başlatın.
      </div>
    )
  }

  let groups = scanResult.duplicates.filter((g) => g.wastedBytes >= minWasted)
  groups = [...groups].sort((a, b) => {
    if (sortBy === 'wasted') return b.wastedBytes - a.wastedBytes
    if (sortBy === 'count') return b.files.length - a.files.length
    return b.files[0].size - a.files[0].size
  })

  const totalWasted = groups.reduce((s, g) => s + g.wastedBytes, 0)

  const selectGroup = (group: DuplicateGroup) => {
    group.files.filter((f) => !f.isOriginal).forEach((f) => toggleSelect(f.path))
  }

  const selectAllDuplicates = () => {
    groups.flatMap((g) => g.files.filter((f) => !f.isOriginal)).forEach((f) => toggleSelect(f.path))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center gap-3 shrink-0">
        <span className="text-[13px] font-semibold">Yinelenen Dosyalar</span>
        <span className="bg-[#1e1e1e] text-[#888] text-[10px] px-2 py-0.5 rounded">{groups.length} grup</span>
        <div className="flex-1" />
        {totalWasted > 0 && (
          <span className="text-[11px] text-red-400">{formatBytes(totalWasted)} kurtarılabilir</span>
        )}
      </div>

      {/* Filters row */}
      <div className="px-5 py-2 border-b border-[#1e1e1e] flex items-center gap-4 shrink-0">
        {/* Min wasted */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#555] uppercase tracking-wider">Min. israf</span>
          <div className="flex gap-1">
            {MIN_WASTED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMinWasted(opt.value)}
                className={`px-2 py-0.5 rounded text-[10px] transition ${minWasted === opt.value ? 'bg-[#2d1f4e] text-violet-400' : 'bg-[#1e1e1e] text-[#666] hover:text-white'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1" />
        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#555] uppercase tracking-wider">Sırala</span>
          <div className="flex gap-1">
            {([['wasted', 'İsraf'], ['count', 'Kopya Sayısı'], ['size', 'Dosya Boyutu']] as const).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={`px-2 py-0.5 rounded text-[10px] transition ${sortBy === val ? 'bg-[#2d1f4e] text-violet-400' : 'bg-[#1e1e1e] text-[#666] hover:text-white'}`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        {groups.length > 0 && (
          <button
            onClick={selectAllDuplicates}
            className="px-2 py-0.5 bg-[#1e1e1e] text-[#888] hover:text-white rounded text-[10px] transition"
          >
            Tüm Kopyaları Seç
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 && (
          <div className="flex items-center justify-center h-32 text-[#555] text-[12px]">
            Bu filtrelerle yinelenen dosya bulunamadı.
          </div>
        )}
        {groups.map((group) => (
          <div key={group.hash} className="border-b border-[#1e1e1e]">
            <div className="px-5 py-2.5 bg-[#111] flex items-center gap-3">
              <span className="text-violet-400 text-sm">⎘</span>
              <div className="flex-1 overflow-hidden">
                <span className="text-[11px] font-semibold text-white">{group.files.length} kopya</span>
                <span className="text-[9px] text-[#555] ml-2">
                  {group.hash.slice(0, 8)}... · {formatBytes(group.wastedBytes)} israf · {formatBytes(group.files[0].size)} / dosya
                </span>
              </div>
              <button
                onClick={() => selectGroup(group)}
                className="px-2 py-0.5 bg-[#2d1f4e] text-violet-400 rounded text-[10px] hover:brightness-125 transition shrink-0"
              >
                Kopyaları Seç
              </button>
            </div>
            {group.files.map((file) => {
              const isSelected = selectedPaths.has(file.path)
              const daysSince = Math.round((Date.now() - file.lastAccessed) / 86400000)
              return (
                <div
                  key={file.path}
                  className={`flex items-center gap-3 px-5 py-2 border-t border-[#161616]
                    ${file.isOriginal ? 'bg-[#0a1a12]' : 'bg-[#1a0d0d]'}`}
                >
                  <div
                    onClick={() => !file.isOriginal && toggleSelect(file.path)}
                    className={`w-3 h-3 rounded-sm border flex items-center justify-center text-[7px] shrink-0
                      ${file.isOriginal
                        ? 'border-emerald-700 opacity-30 cursor-not-allowed'
                        : isSelected
                          ? 'bg-blue-500 border-blue-500 text-white cursor-pointer'
                          : 'border-[#333] cursor-pointer hover:border-[#555]'}`}
                  >
                    {isSelected && !file.isOriginal && '✓'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className={`text-[10px] truncate ${file.isOriginal ? 'text-emerald-400' : 'text-[#ccc]'}`}>
                      {file.name}
                    </div>
                    <div className="text-[9px] text-[#444] truncate">
                      {parentDir(file.path)}
                    </div>
                  </div>
                  <div className="text-[9px] text-[#666] shrink-0">{daysSince} gün önce erişildi</div>
                  <div className="text-[10px] text-[#888] shrink-0">{formatBytes(file.size)}</div>
                  {file.isOriginal
                    ? <span className="text-[9px] bg-[#0d2a1e] text-emerald-400 px-1.5 py-0.5 rounded shrink-0">Orijinal</span>
                    : <span className="text-[9px] bg-[#1e1e1e] text-[#888] px-1.5 py-0.5 rounded shrink-0">Kopya</span>
                  }
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {trashProgress && (
        <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-5 py-3 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-red-400 font-medium">
              {LABELS.trashProgress} — {trashProgress.done.toLocaleString('tr-TR')} / {trashProgress.total.toLocaleString('tr-TR')} dosya
            </span>
            <span className="text-[11px] text-red-300 font-semibold tabular-nums">
              {Math.round((trashProgress.done / trashProgress.total) * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-150"
              style={{ width: `${Math.round((trashProgress.done / trashProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {!trashProgress && selectedPaths.size > 0 && (
        <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-5 py-3 flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-[#888]">{selectedPaths.size} kopya seçili</span>
          <div className="flex-1" />
          <button
            onClick={trashSelected}
            className="px-3 py-1.5 bg-red-500 rounded text-[11px] text-white font-semibold hover:bg-red-600 transition"
          >
            {LABELS.trashSelected}
          </button>
        </div>
      )}
    </div>
  )
}
