// src/renderer/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useAppStore } from '../store/app.store'
import { useScan } from '../hooks/useScan'
import type { DiskInfo } from '../types'

function formatBytes(b: number) {
  if (b > 1e9) return `${(b / 1e9).toFixed(1)} GB`
  if (b > 1e6) return `${(b / 1e6).toFixed(0)} MB`
  return `${Math.round(b / 1e3)} KB`
}

const CATEGORY_COLORS: Record<string, string> = {
  document: '#3b82f6',
  video: '#8b5cf6',
  screenshot: '#f59e0b',
  backup: '#ef4444',
  download: '#10b981',
  cache: '#6b7280',
  other: '#374151',
}

export function Dashboard() {
  const { scanResult, isScanning, scanProgress, setActiveView } = useAppStore()
  const { startScan } = useScan()
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null)

  useEffect(() => {
    window.cleaner.getDiskInfo().then(setDiskInfo)
  }, [])

  const usedPct = diskInfo ? (diskInfo.used / diskInfo.total) * 100 : 0

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Disk cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'TOPLAM ALAN', value: diskInfo ? formatBytes(diskInfo.total) : '—', color: 'text-white' },
          { label: 'KULLANILAN', value: diskInfo ? formatBytes(diskInfo.used) : '—', color: usedPct > 80 ? 'text-red-400' : 'text-orange-400' },
          { label: 'BOŞ ALAN', value: diskInfo ? formatBytes(diskInfo.free) : '—', color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
            <div className="text-[10px] text-[#666] mb-1.5">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Category bar */}
      {diskInfo && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 mb-6">
          <div className="text-[10px] font-semibold text-[#666] mb-3">ALAN KULLANIMI</div>
          <div className="flex h-3 rounded-full overflow-hidden bg-[#1a1a1a] mb-3">
            {Object.entries(diskInfo.byCategory).map(([cat, bytes]) => (
              <div
                key={cat}
                style={{
                  width: `${(bytes / diskInfo.used) * 100}%`,
                  background: CATEGORY_COLORS[cat] ?? '#374151',
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(diskInfo.byCategory).map(([cat, bytes]) => (
              bytes > 0 && (
                <span key={cat} className="text-[10px]" style={{ color: CATEGORY_COLORS[cat] }}>
                  ■ {cat} {formatBytes(bytes)}
                </span>
              )
            ))}
          </div>
        </div>
      )}

      {/* Scan progress */}
      {isScanning && scanProgress && (
        <div className="bg-[#111] border border-[#1e3a5f] rounded-lg p-4 mb-6">
          <div className="text-[11px] text-blue-400 mb-1">
            {scanProgress.phase === 'scanning' && `Taranıyor... ${scanProgress.scanned} dosya`}
            {scanProgress.phase === 'hashing' && 'Hash hesaplanıyor...'}
            {scanProgress.phase === 'image-hashing' && 'Benzer resimler aranıyor...'}
            {scanProgress.phase === 'done' && 'Tamamlandı!'}
          </div>
          {scanProgress.currentPath && (
            <div className="text-[9px] text-[#555] truncate">{scanProgress.currentPath}</div>
          )}
        </div>
      )}

      {/* Last result summary */}
      {scanResult && !isScanning && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 mb-6">
          <div className="text-[10px] text-[#666] mb-2">
            SON TARAMA — {new Date(scanResult.scannedAt).toLocaleString('tr-TR')}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Kullanılmayan', count: scanResult.unused.length, view: 'unused' as const },
              { label: 'Yinelenen Grup', count: scanResult.duplicates.length, view: 'duplicates' as const },
              { label: 'Büyük Dosya', count: scanResult.large.length, view: 'large' as const },
              { label: 'Benzer Resim Grubu', count: scanResult.similarImages.length, view: 'similar' as const },
            ].map(({ label, count, view }) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className="text-left hover:opacity-80 transition-opacity"
              >
                <div className="text-lg font-bold text-white">{count}</div>
                <div className="text-[10px] text-[#666]">{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick scan buttons */}
      <div className="text-[10px] font-semibold text-[#666] mb-3">HIZLI TARAMA</div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Kullanılmayan Dosyalar', desc: 'Son 90 günde açılmamış', icon: '⏱', border: 'border-[#1e3a5f]', iconColor: 'text-blue-400', view: 'unused' as const },
          { label: 'Yinelenen Dosyalar', desc: 'İçerik hash karşılaştırması', icon: '⎘', border: 'border-[#2d1f4e]', iconColor: 'text-violet-400', view: 'duplicates' as const },
          { label: 'Büyük Dosyalar', desc: '100 MB üzeri', icon: '⬆', border: 'border-[#3d2a0f]', iconColor: 'text-amber-400', view: 'large' as const },
          { label: 'Tam Tarama', desc: 'Tüm kategoriler', icon: '▦', border: 'border-[#1e3a2a]', iconColor: 'text-emerald-400', view: null },
        ].map(({ label, desc, icon, border, iconColor, view }) => (
          <button
            key={label}
            onClick={() => {
              startScan()
              if (view) setActiveView(view)
            }}
            disabled={isScanning}
            className={`bg-[#111] border ${border} rounded-lg p-4 text-left hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <div className={`text-xl mb-2 ${iconColor}`}>{icon}</div>
            <div className="text-[12px] font-medium text-white">{label}</div>
            <div className="text-[10px] text-[#555] mt-0.5">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
