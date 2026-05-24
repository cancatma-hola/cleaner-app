// src/renderer/src/pages/LargeFiles.tsx
import { useState } from 'react'
import { useAppStore } from '../store/app.store'
import { ActionBar } from '../components/ActionBar'
import { PreviewPanel } from '../components/PreviewPanel'
import type { ScannedFile } from '../types'

function formatBytes(b: number) {
  if (b > 1e9) return `${(b / 1e9).toFixed(1)} GB`
  if (b > 1e6) return `${(b / 1e6).toFixed(0)} MB`
  return `${Math.round(b / 1e3)} KB`
}

export function LargeFiles() {
  const { scanResult, selectedPaths, toggleSelect } = useAppStore()
  const [previewFile, setPreviewFile] = useState<ScannedFile | null>(null)
  const [minMB, setMinMB] = useState(100)

  if (!scanResult) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#555] text-[13px]">
        Henüz tarama yapılmadı. Dashboard'dan taramayı başlatın.
      </div>
    )
  }

  const files = [...scanResult.large]
    .filter((f) => f.size >= minMB * 1e6)
    .sort((a, b) => b.size - a.size)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center gap-3 shrink-0">
        <span className="text-[13px] font-semibold">Büyük Dosyalar</span>
        <span className="bg-[#1e1e1e] text-[#888] text-[10px] px-2 py-0.5 rounded">{files.length} dosya</span>
        <div className="flex-1" />
        {[50, 100, 500, 1000].map((mb) => (
          <button
            key={mb}
            onClick={() => setMinMB(mb)}
            className={`px-2 py-0.5 rounded text-[10px] transition ${minMB === mb ? 'bg-[#3d2a0f] text-amber-400' : 'bg-[#1e1e1e] text-[#666] hover:text-white'}`}
          >
            {mb >= 1000 ? `${mb / 1000}GB+` : `${mb}MB+`}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[28px_1fr_90px_110px_60px] gap-2 px-5 py-2 text-[9px] font-bold text-[#555] uppercase tracking-wider border-b border-[#161616] sticky top-0 bg-[#0a0a0a]">
            <span /><span>Dosya Adı</span><span>Boyut</span><span>Son Değişiklik</span><span>Tür</span>
          </div>
          {files.map((file) => {
            const isSelected = selectedPaths.has(file.path)
            const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.') + 1).toUpperCase() : '—'
            return (
              <div
                key={file.path}
                onClick={() => setPreviewFile(file)}
                className={`grid grid-cols-[28px_1fr_90px_110px_60px] gap-2 px-5 py-2.5 border-b border-[#161616] items-center cursor-pointer transition-colors
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
                  <div className="text-[9px] text-[#555] truncate">{file.path.replace('/' + file.name, '')}</div>
                </div>
                <div className={`text-[11px] font-medium ${file.size > 1e9 ? 'text-red-400' : 'text-amber-400'}`}>
                  {formatBytes(file.size)}
                </div>
                <div className="text-[11px] text-[#666]">
                  {new Date(file.lastModified).toLocaleDateString('tr-TR')}
                </div>
                <div className="text-[9px] text-[#888] bg-[#1e1e1e] px-1.5 py-0.5 rounded text-center truncate">{ext}</div>
              </div>
            )
          })}
          {files.length === 0 && (
            <div className="flex items-center justify-center h-32 text-[#555] text-[12px]">
              Bu eşikte büyük dosya bulunamadı.
            </div>
          )}
        </div>
        {previewFile && (
          <PreviewPanel
            file={previewFile}
            onTrash={async () => {
              await window.cleaner.trashFiles([previewFile.path])
              setPreviewFile(null)
            }}
          />
        )}
      </div>
      <ActionBar files={files} />
    </div>
  )
}
