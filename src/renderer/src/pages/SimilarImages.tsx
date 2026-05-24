// src/renderer/src/pages/SimilarImages.tsx
import { formatBytes } from '../utils/format'
import { useAppStore } from '../store/app.store'
import { useTrash } from '../hooks/useTrash'


export function SimilarImages() {
  const { scanResult, selectedPaths, toggleSelect } = useAppStore()
  const { trashSelected } = useTrash()

  if (!scanResult) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#555] text-[13px]">
        Henüz tarama yapılmadı. Dashboard'dan taramayı başlatın.
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center gap-3 shrink-0">
        <span className="text-[13px] font-semibold">Benzer Resimler</span>
        <span className="bg-[#1e1e1e] text-[#888] text-[10px] px-2 py-0.5 rounded">
          {scanResult.similarImages.length} grup
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {scanResult.similarImages.length === 0 && (
          <div className="flex items-center justify-center h-32 text-[#555] text-[12px]">
            Benzer resim grubu bulunamadı.
          </div>
        )}
        {scanResult.similarImages.map((group) => (
          <div key={group.id} className="border-b border-[#1e1e1e] p-5">
            <div className="text-[10px] text-[#555] mb-3">
              Benzerlik: <span className="text-amber-400">{Math.round(group.similarity * 100)}%</span>
              <span className="ml-3 text-[#444]">{group.files.length} resim</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {group.files.map((file) => {
                const isSelected = selectedPaths.has(file.path)
                return (
                  <div
                    key={file.path}
                    onClick={() => toggleSelect(file.path)}
                    className={`shrink-0 w-40 border rounded-lg overflow-hidden cursor-pointer transition
                      ${isSelected ? 'border-blue-500' : 'border-[#1e1e1e] hover:border-[#333]'}`}
                  >
                    <img
                      src={`file://${file.path}`}
                      alt={file.name}
                      className="w-full h-28 object-cover"
                    />
                    <div className="p-2 bg-[#111]">
                      <div className="text-[9px] text-white truncate">{file.name}</div>
                      <div className="text-[9px] text-amber-400">{formatBytes(file.size)}</div>
                      <div className="text-[9px] text-[#555]">
                        {new Date(file.created).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedPaths.size > 0 && (
        <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-5 py-3 flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-[#888]">{selectedPaths.size} resim seçili</span>
          <div className="flex-1" />
          <button
            onClick={trashSelected}
            className="px-3 py-1.5 bg-red-500 rounded text-[11px] text-white font-semibold hover:bg-red-600 transition"
          >
            Seçilenleri Çöpe Taşı
          </button>
        </div>
      )}
    </div>
  )
}
