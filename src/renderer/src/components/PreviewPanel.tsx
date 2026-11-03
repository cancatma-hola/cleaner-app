// src/renderer/src/components/PreviewPanel.tsx
import { formatBytes } from '../utils/format'
import type { ScannedFile } from '../types'
import { LABELS, previewUrl } from '../utils/platform'


const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.bmp'])

interface PreviewPanelProps {
  file: ScannedFile
  onTrash: () => void
}

export function PreviewPanel({ file, onTrash }: PreviewPanelProps) {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  const isImage = IMAGE_EXTS.has(ext)
  const daysSince = Math.round((Date.now() - file.lastAccessed) / 86400000)

  return (
    <div className="w-64 shrink-0 border-l border-[#1e1e1e] flex flex-col bg-[#0d0d0d]">
      <div className="flex-1 flex items-center justify-center border-b border-[#1e1e1e] p-4 overflow-hidden">
        {isImage ? (
          <img
            src={previewUrl(file.path)}
            alt={file.name}
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : (
          <div className="text-4xl opacity-40">
            {ext === '.pdf' ? '📄' : ['.zip', '.tar', '.gz', '.rar', '.7z'].includes(ext) ? '🗜' : '📁'}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="text-[11px] font-semibold text-white mb-3 break-all">{file.name}</div>
        <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-4">
          <div>
            <div className="text-[9px] text-[#555] uppercase">Boyut</div>
            <div className="text-[11px] text-amber-400">{formatBytes(file.size)}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#555] uppercase">Son Erişim</div>
            <div className="text-[11px] text-[#888]">{daysSince} gün önce</div>
          </div>
          <div>
            <div className="text-[9px] text-[#555] uppercase">Oluşturulma</div>
            <div className="text-[11px] text-[#888]">{new Date(file.created).toLocaleDateString('tr-TR')}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#555] uppercase">Tür</div>
            <div className="text-[11px] text-[#888] uppercase">{ext.replace('.', '') || '—'}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.cleaner.revealInFinder(file.path)}
            className="flex-1 py-1.5 bg-[#1e1e1e] rounded text-[10px] text-[#888] hover:text-white transition"
          >
            {LABELS.revealInFileManager}
          </button>
          <button
            onClick={onTrash}
            title={LABELS.trashAction}
            className="flex-1 py-1.5 bg-red-500 rounded text-[10px] text-white hover:bg-red-600 transition"
          >
            {LABELS.trashActionShort}
          </button>
        </div>
      </div>
    </div>
  )
}
