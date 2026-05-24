// src/renderer/src/store/app.store.ts
import { create } from 'zustand'
import type { ScanResult, ScanProgress, AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

type ActiveView = 'dashboard' | 'unused' | 'duplicates' | 'large' | 'similar' | 'settings'

interface AppState {
  scanResult: ScanResult | null
  isScanning: boolean
  scanProgress: ScanProgress | null
  selectedPaths: Set<string>
  settings: AppSettings
  activeView: ActiveView

  setScanResult: (r: ScanResult) => void
  setScanning: (v: boolean) => void
  setScanProgress: (p: ScanProgress | null) => void
  toggleSelect: (path: string) => void
  selectAll: (category: 'unused' | 'large') => void
  clearSelection: () => void
  setSettings: (s: AppSettings) => void
  setActiveView: (v: ActiveView) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  scanResult: null,
  isScanning: false,
  scanProgress: null,
  selectedPaths: new Set(),
  settings: DEFAULT_SETTINGS,
  activeView: 'dashboard',

  setScanResult: (r) => set({ scanResult: r }),
  setScanning: (v) => set({ isScanning: v }),
  setScanProgress: (p) => set({ scanProgress: p }),

  toggleSelect: (path) => {
    const s = new Set(get().selectedPaths)
    if (s.has(path)) s.delete(path)
    else s.add(path)
    set({ selectedPaths: s })
  },

  selectAll: (category) => {
    const result = get().scanResult
    if (!result) return
    set({ selectedPaths: new Set(result[category].map((f) => f.path)) })
  },

  clearSelection: () => set({ selectedPaths: new Set() }),
  setSettings: (s) => set({ settings: s }),
  setActiveView: (v) => set({ activeView: v }),
  reset: () => set({
    scanResult: null,
    isScanning: false,
    scanProgress: null,
    selectedPaths: new Set(),
  }),
}))
