// src/renderer/src/pages/Settings.tsx
import { useState } from 'react'
import { useAppStore } from '../store/app.store'
import type { AppSettings } from '../types'

export function Settings() {
  const { settings, setSettings } = useAppStore()
  const [local, setLocal] = useState<AppSettings>(settings)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [newPath, setNewPath] = useState('')

  const update = (patch: Partial<AppSettings>) =>
    setLocal((prev) => ({ ...prev, ...patch }))

  const updateScanConfig = (patch: Partial<AppSettings['scanConfig']>) =>
    update({ scanConfig: { ...local.scanConfig, ...patch } })

  const addPath = () => {
    const val = newPath.trim()
    if (val && val.startsWith('/') && !local.scanConfig.paths.includes(val)) {
      updateScanConfig({ paths: [...local.scanConfig.paths, val] })
      setNewPath('')
    }
  }

  const save = async () => {
    try {
      await window.cleaner.saveSettings(local)
      setSettings(local)
      setSaved(true)
      setSaveError(null)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Kayıt başarısız')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
      <h2 className="text-[14px] font-semibold mb-6 text-white">Ayarlar</h2>

      {/* Scan paths */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[10px] font-bold text-[#666] uppercase">Tarama Klasörleri</div>
          <div className="flex-1" />
          <button
            onClick={() => {
              updateScanConfig({ paths: ['/Users/cancatma/Desktop/cleaner-test'] })
            }}
            className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] hover:bg-amber-500/30 transition"
          >
            Test Modu
          </button>
          <button
            onClick={() => {
              updateScanConfig({ paths: ['/Users'] })
            }}
            className="px-2 py-0.5 bg-[#1e1e1e] text-[#666] rounded text-[9px] hover:text-white transition"
          >
            Tam Tarama
          </button>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 space-y-2">
          {local.scanConfig.paths.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-[11px] text-[#ccc] bg-[#1a1a1a] px-3 py-1.5 rounded truncate">{p}</span>
              <button
                onClick={() => updateScanConfig({
                  paths: local.scanConfig.paths.filter((_, j) => j !== i),
                })}
                className="text-[#555] hover:text-red-400 text-[13px] transition shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="text-[10px] text-[#555] mt-2">Yeni klasör eklemek için aşağıdan yolu girin:</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/Users/kullanici/Documents"
              onKeyDown={(e) => { if (e.key === 'Enter') addPath() }}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-[11px] text-white rounded px-3 py-1.5 outline-none focus:border-blue-500"
            />
            <button
              onClick={addPath}
              className="px-3 py-1.5 bg-[#1e3a5f] text-blue-400 rounded text-[10px] hover:brightness-125 transition"
            >
              Ekle
            </button>
          </div>
        </div>
      </section>

      {/* Exclusion patterns */}
      <section className="mb-6">
        <div className="text-[10px] font-bold text-[#666] uppercase mb-3">Dışlama Kuralları</div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 space-y-2">
          {local.scanConfig.excludePatterns.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-[11px] text-[#888] bg-[#1a1a1a] px-3 py-1.5 rounded font-mono truncate">{p}</span>
              <button
                onClick={() => updateScanConfig({
                  excludePatterns: local.scanConfig.excludePatterns.filter((_, j) => j !== i),
                })}
                className="text-[#555] hover:text-red-400 text-[13px] transition shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Thresholds */}
      <section className="mb-6">
        <div className="text-[10px] font-bold text-[#666] uppercase mb-3">Eşik Değerleri</div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-white">Kullanılmayan dosya eşiği</div>
              <div className="text-[9px] text-[#555] mt-0.5">Bu kadar günden fazla açılmayan dosyalar</div>
            </div>
            <select
              value={local.scanConfig.unusedThresholdDays}
              onChange={(e) => updateScanConfig({ unusedThresholdDays: Number(e.target.value) })}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-[11px] text-white rounded px-2 py-1 outline-none"
            >
              {[30, 60, 90, 180, 365].map((d) => (
                <option key={d} value={d}>{d} gün</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-white">Büyük dosya eşiği</div>
              <div className="text-[9px] text-[#555] mt-0.5">Bu boyutun üzerindeki dosyalar</div>
            </div>
            <select
              value={local.scanConfig.largeSizeThresholdMB}
              onChange={(e) => updateScanConfig({ largeSizeThresholdMB: Number(e.target.value) })}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-[11px] text-white rounded px-2 py-1 outline-none"
            >
              {[50, 100, 200, 500, 1000].map((mb) => (
                <option key={mb} value={mb}>{mb >= 1000 ? `${mb / 1000} GB` : `${mb} MB`}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-white">Gizli dosyaları tara</div>
              <div className="text-[9px] text-[#555] mt-0.5">Nokta ile başlayan dosyalar dahil edilsin mi</div>
            </div>
            <button
              onClick={() => updateScanConfig({ includeHidden: !local.scanConfig.includeHidden })}
              className={`w-10 h-5 rounded-full transition-colors relative ${local.scanConfig.includeHidden ? 'bg-blue-500' : 'bg-[#333]'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${local.scanConfig.includeHidden ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section className="mb-6">
        <div className="text-[10px] font-bold text-[#666] uppercase mb-3">Otomatik Tarama</div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-white">Zamanlanmış tarama</div>
              <div className="text-[9px] text-[#555] mt-0.5">Tarama tamamlanınca bildirim gönderilir</div>
            </div>
            <button
              onClick={() => update({ scheduleEnabled: !local.scheduleEnabled })}
              className={`w-10 h-5 rounded-full transition-colors relative ${local.scheduleEnabled ? 'bg-blue-500' : 'bg-[#333]'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${local.scheduleEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {local.scheduleEnabled && (
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-[#888]">Sıklık</div>
              <select
                value={local.scheduleFrequency}
                onChange={(e) => update({ scheduleFrequency: e.target.value as 'weekly' | 'monthly' })}
                className="bg-[#1a1a1a] border border-[#2a2a2a] text-[11px] text-white rounded px-2 py-1 outline-none"
              >
                <option value="weekly">Haftalık</option>
                <option value="monthly">Aylık</option>
              </select>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-white">macOS Bildirimleri</div>
              <div className="text-[9px] text-[#555] mt-0.5">Tarama tamamlanınca bildir</div>
            </div>
            <button
              onClick={() => update({ notificationsEnabled: !local.notificationsEnabled })}
              className={`w-10 h-5 rounded-full transition-colors relative ${local.notificationsEnabled ? 'bg-blue-500' : 'bg-[#333]'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${local.notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className={`px-4 py-2 rounded text-[12px] font-semibold transition ${
            saved ? 'bg-emerald-600 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {saved ? '✓ Kaydedildi' : 'Kaydet'}
        </button>
        {saveError && (
          <span className="text-[11px] text-red-400">{saveError}</span>
        )}
      </div>
    </div>
  )
}
