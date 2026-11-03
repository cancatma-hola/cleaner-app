// src/renderer/src/pages/Dashboard.tsx
import { formatBytes } from '../utils/format'
import { useEffect, useState } from 'react'
import { useAppStore } from '../store/app.store'
import { useScan } from '../hooks/useScan'
import type { DiskInfo } from '../types'
import { isWin } from '../utils/platform'


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
  const { scanResult, isScanning, scanProgress, setActiveView, settings } = useAppStore()
  const { unusedThresholdDays, largeSizeThresholdMB } = settings.scanConfig
  const { startScan } = useScan()
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null)

  useEffect(() => {
    window.cleaner.getDiskInfo().then(setDiskInfo).catch(() => {})
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
          {(() => {
            const { phase, scanned, hashed, hashTotal, imageHashed, imageHashTotal } = scanProgress
            let label = ''
            let sub = ''
            let pct = 0
            let indeterminate = false

            if (phase === 'scanning') {
              indeterminate = true
              label = `Dosyalar taranıyor — ${scanned.toLocaleString('tr-TR')} dosya`
              sub = scanProgress.currentPath || ''
            } else if (phase === 'hashing') {
              const t = hashTotal ?? 0
              pct = t > 0 ? Math.min(100, Math.round(((hashed ?? 0) / t) * 100)) : 0
              label = `Hash hesaplanıyor — ${(hashed ?? 0).toLocaleString('tr-TR')} / ${t.toLocaleString('tr-TR')} dosya`
              sub = 'Yinelenen dosyalar için SHA-1 karşılaştırması yapılıyor'
            } else if (phase === 'image-hashing') {
              const t = imageHashTotal ?? 0
              if (t === 0) { indeterminate = true; pct = 0 }
              else pct = Math.min(100, Math.round(((imageHashed ?? 0) / t) * 100))
              label = `Benzer resimler aranıyor — ${(imageHashed ?? 0).toLocaleString('tr-TR')} / ${t > 0 ? t.toLocaleString('tr-TR') : '?'} resim`
              sub = 'Algısal hash (perceptual hash) ile karşılaştırılıyor'
            } else {
              pct = 100
              label = 'Tamamlandı!'
            }

            return (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-blue-400 font-medium">{label}</span>
                  {!indeterminate && pct > 0 && <span className="text-[11px] text-blue-300 font-semibold tabular-nums">{pct}%</span>}
                </div>
                <div className="h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden mb-1.5">
                  {indeterminate ? (
                    <div className="h-full w-1/3 bg-blue-500 rounded-full animate-pulse" />
                  ) : (
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                </div>
                {sub && <div className="text-[9px] text-[#444] truncate">{sub}</div>}
              </>
            )
          })()}
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
          { label: 'Kullanılmayan Dosyalar', desc: `Son ${unusedThresholdDays} günde açılmamış`, icon: '⏱', border: 'border-[#1e3a5f]', iconColor: 'text-blue-400', view: 'unused' as const },
          { label: 'Yinelenen Dosyalar', desc: 'İçerik hash karşılaştırması', icon: '⎘', border: 'border-[#2d1f4e]', iconColor: 'text-violet-400', view: 'duplicates' as const },
          { label: 'Büyük Dosyalar', desc: largeSizeThresholdMB >= 1000 ? `${largeSizeThresholdMB / 1000} GB üzeri` : `${largeSizeThresholdMB} MB üzeri`, icon: '⬆', border: 'border-[#3d2a0f]', iconColor: 'text-amber-400', view: 'large' as const },
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
        <button
          onClick={() => setActiveView('system')}
          className="col-span-2 bg-[#111] border border-[#3a1e3a] rounded-lg p-4 text-left hover:brightness-110 transition flex items-center gap-4"
        >
          <div className="text-xl text-pink-400">✦</div>
          <div>
            <div className="text-[12px] font-medium text-white">Sistem Temizliği</div>
            <div className="text-[10px] text-[#555] mt-0.5">
              Geçici dosyalar, tarayıcı önbellekleri, hata raporları ve {isWin ? 'Geri Dönüşüm Kutusu' : 'Çöp Kutusu'}
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
