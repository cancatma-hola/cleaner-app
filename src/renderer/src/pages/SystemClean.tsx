// src/renderer/src/pages/SystemClean.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatBytes } from '../utils/format'
import { isWin } from '../utils/platform'
import type { CleanGroup, CleanOutcome, CleanStats, CleanTarget } from '../types'

type StatState = { status: 'loading' } | { status: 'ok'; stats: CleanStats } | { status: 'error'; message: string }

const GROUPS: { key: CleanGroup; label: string }[] = [
  { key: 'system', label: 'Sistem' },
  { key: 'browser', label: 'Tarayıcılar' },
  { key: 'developer', label: 'Geliştirici araçları' },
  { key: 'trash', label: isWin ? 'Geri Dönüşüm Kutusu' : 'Çöp Kutusu' },
]

export function SystemClean() {
  const [targets, setTargets] = useState<CleanTarget[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<Record<string, StatState>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [outcomes, setOutcomes] = useState<Record<string, CleanOutcome>>({})
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'cleaning'>('idle')
  const [cleaningId, setCleaningId] = useState<string | null>(null)

  const analyze = useCallback(async (ids: string[]) => {
    setStats((prev) => {
      const next = { ...prev }
      for (const id of ids) next[id] = { status: 'loading' }
      return next
    })
    await Promise.all(
      ids.map(async (id) => {
        try {
          const s = await window.cleaner.analyzeCleanTarget(id)
          setStats((prev) => ({ ...prev, [id]: { status: 'ok', stats: s } }))
        } catch (err) {
          setStats((prev) => ({ ...prev, [id]: { status: 'error', message: (err as Error).message } }))
        }
      }),
    )
  }, [])

  const load = useCallback(async () => {
    setListError(null)
    setOutcomes({})
    try {
      const [list, info] = await Promise.all([window.cleaner.listCleanTargets(), window.cleaner.getSystemInfo()])
      setTargets(list)
      setIsAdmin(info.isAdmin)
      setSelected(new Set(list.filter((t) => t.defaultSelected && (!t.requiresAdmin || info.isAdmin)).map((t) => t.id)))
      void analyze(list.map((t) => t.id))
    } catch (err) {
      setListError((err as Error).message)
    }
  }, [analyze])

  useEffect(() => { void load() }, [load])

  const sizeOf = (id: string) => {
    const s = stats[id]
    return s && s.status === 'ok' ? s.stats.bytes : 0
  }

  const analyzing = Object.values(stats).some((s) => s.status === 'loading')
  const totalAll = useMemo(() => (targets ?? []).reduce((sum, t) => sum + sizeOf(t.id), 0), [targets, stats]) // eslint-disable-line react-hooks/exhaustive-deps
  const totalSelected = useMemo(
    () => (targets ?? []).filter((t) => selected.has(t.id)).reduce((sum, t) => sum + sizeOf(t.id), 0),
    [targets, stats, selected], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const totalFreed = Object.values(outcomes).reduce((s, o) => s + o.freedBytes, 0)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const runClean = async () => {
    if (!targets) return
    const ids = targets.filter((t) => selected.has(t.id)).map((t) => t.id)
    setPhase('cleaning')
    setOutcomes({})
    for (const id of ids) {
      setCleaningId(id)
      try {
        const o = await window.cleaner.cleanTarget(id)
        setOutcomes((prev) => ({ ...prev, [id]: o }))
      } catch (err) {
        setOutcomes((prev) => ({
          ...prev,
          [id]: { id, freedBytes: 0, deleted: 0, failed: 0, skippedYoung: 0, error: (err as Error).message },
        }))
      }
    }
    setCleaningId(null)
    setPhase('idle')
    await analyze(ids)
  }

  if (listError) {
    return <div className="flex-1 flex items-center justify-center text-red-400 text-[12px]">Hedefler yüklenemedi: {listError}</div>
  }

  const selectedTargets = (targets ?? []).filter((t) => selected.has(t.id))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center gap-3 shrink-0">
        <span className="text-[13px] font-semibold">Sistem Temizliği</span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded ${isAdmin ? 'bg-[#0d2a1e] text-emerald-400' : 'bg-[#1e1e1e] text-[#888]'}`}
          title={isAdmin ? '' : 'Bazı hedefler (Windows Temp, Windows Update) yalnız yönetici olarak çalıştırıldığında temizlenebilir'}
        >
          {isAdmin ? 'Yönetici' : 'Standart kullanıcı'}
        </span>
        <div className="flex-1" />
        <span className="text-[11px] text-[#888]">
          Toplam kazanılabilir: <span className="text-pink-400 font-semibold">{formatBytes(totalAll)}</span>
          {analyzing && <span className="ml-2 text-[#555]">Analiz ediliyor…</span>}
        </span>
        <button
          onClick={() => void load()}
          disabled={analyzing || phase !== 'idle'}
          className="px-2 py-0.5 bg-[#1e1e1e] rounded text-[10px] text-[#888] hover:text-white transition disabled:opacity-40"
        >
          Yeniden Analiz Et
        </button>
      </div>

      {!isAdmin && isWin && (
        <div className="px-5 py-2 border-b border-[#1e1e1e] text-[10px] text-amber-400/80 bg-[#1a140a] shrink-0">
          Uygulama yönetici olarak çalışmıyor. "Yönetici gerekir" işaretli hedefler kısmen temizlenir — tamamı için
          uygulamaya sağ tıklayıp "Yönetici olarak çalıştır" seçin.
        </div>
      )}

      {/* Target list */}
      <div className="flex-1 overflow-y-auto">
        {targets === null && (
          <div className="flex items-center justify-center h-32 text-[#555] text-[12px]">Hedefler yükleniyor…</div>
        )}
        {targets !== null && targets.length === 0 && (
          <div className="flex items-center justify-center h-32 text-[#555] text-[12px]">Bu sistemde temizlenecek hedef bulunamadı.</div>
        )}
        {GROUPS.map(({ key, label }) => {
          const items = (targets ?? []).filter((t) => t.group === key)
          if (items.length === 0) return null
          return (
            <div key={key} className="border-b border-[#1e1e1e]">
              <div className="px-5 py-2 bg-[#111] text-[9px] font-bold text-[#666] uppercase tracking-wider">{label}</div>
              {items.map((t) => {
                const st = stats[t.id]
                const out = outcomes[t.id]
                const isSel = selected.has(t.id)
                const needsAdmin = t.requiresAdmin && !isAdmin
                return (
                  <div
                    key={t.id}
                    onClick={() => phase === 'idle' && toggle(t.id)}
                    className={`flex items-start gap-3 px-5 py-3 border-t border-[#161616] cursor-pointer transition-colors
                      ${isSel ? 'bg-[#0f1f2f]' : 'hover:bg-[#111]'} ${cleaningId === t.id ? 'animate-pulse' : ''}`}
                    title={t.roots.join('\n')}
                  >
                    <div
                      className={`mt-0.5 w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[8px] shrink-0
                        ${isSel ? 'bg-blue-500 border-blue-500 text-white' : 'border-[#333]'}`}
                    >
                      {isSel && '✓'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white">{t.label}</span>
                        {needsAdmin && (
                          <span className="text-[9px] bg-[#3d2a0f] text-amber-400 px-1.5 py-0.5 rounded">Yönetici gerekir</span>
                        )}
                        {t.minAgeHours > 0 && (
                          <span className="text-[9px] bg-[#1e1e1e] text-[#777] px-1.5 py-0.5 rounded">
                            {t.minAgeHours} saatten eski
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-[#555] mt-0.5">{t.description}</div>
                      {t.warning && <div className="text-[9px] text-amber-500/70 mt-0.5">{t.warning}</div>}
                      {out && (
                        <div className={`text-[9px] mt-1 ${out.error ? 'text-red-400' : 'text-emerald-400'}`}>
                          {out.error
                            ? `Hata: ${out.error}`
                            : `✓ ${formatBytes(out.freedBytes)} boşaltıldı · ${out.deleted.toLocaleString('tr-TR')} dosya silindi`}
                          {out.failed > 0 && (
                            <span className="text-amber-400"> · {out.failed.toLocaleString('tr-TR')} öğe kullanımda / erişilemedi, atlandı</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 w-28">
                      {!st || st.status === 'loading' ? (
                        <div className="text-[10px] text-[#555]">Analiz ediliyor…</div>
                      ) : st.status === 'error' ? (
                        <div className="text-[10px] text-red-400" title={st.message}>Hata</div>
                      ) : (
                        <>
                          <div className={`text-[12px] font-semibold ${st.stats.bytes > 1e9 ? 'text-red-400' : st.stats.bytes > 1e8 ? 'text-amber-400' : 'text-[#ccc]'}`}>
                            {formatBytes(st.stats.bytes)}
                          </div>
                          <div className="text-[9px] text-[#555]">{st.stats.files.toLocaleString('tr-TR')} dosya</div>
                          {st.stats.skippedYoung > 0 && (
                            <div className="text-[9px] text-[#444]">{st.stats.skippedYoung.toLocaleString('tr-TR')} yeni dosya korunuyor</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {phase === 'confirm' ? (
        <div className="border-t border-[#3a1e1e] bg-[#160c0c] px-5 py-3 flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-red-300">
            {selectedTargets.length} hedefteki yaklaşık <b>{formatBytes(totalSelected)}</b> kalıcı olarak silinecek
            {isWin ? ' (Geri Dönüşüm Kutusuna gitmez)' : ''}. Emin misiniz?
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setPhase('idle')}
            className="px-3 py-1.5 bg-[#1e1e1e] rounded text-[11px] text-[#aaa] hover:text-white transition"
          >
            Vazgeç
          </button>
          <button
            onClick={() => void runClean()}
            className="px-3 py-1.5 bg-red-500 rounded text-[11px] text-white font-semibold hover:bg-red-600 transition"
          >
            Evet, Temizle
          </button>
        </div>
      ) : (
        <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-5 py-3 flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-[#888]">
            {phase === 'cleaning'
              ? `Temizleniyor — ${targets?.find((t) => t.id === cleaningId)?.label ?? ''}`
              : totalFreed > 0
                ? <>Son temizlik: <span className="text-emerald-400 font-semibold">{formatBytes(totalFreed)}</span> boşaltıldı</>
                : <>{selectedTargets.length} hedef seçili — <span className="text-pink-400 font-semibold">{formatBytes(totalSelected)}</span></>}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setPhase('confirm')}
            disabled={phase !== 'idle' || analyzing || selectedTargets.length === 0}
            className="px-3 py-1.5 bg-pink-600 rounded text-[11px] text-white font-semibold hover:bg-pink-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Seçilenleri Temizle
          </button>
        </div>
      )}
    </div>
  )
}
