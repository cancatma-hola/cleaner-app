// src/renderer/src/store/app.store.ts
import { create } from 'zustand'
import type { ScanResult, ScanProgress, AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

type ActiveView = 'dashboard' | 'unused' | 'duplicates' | 'large' | 'similar' | 'settings'

export interface TrashProgress {
  done: number
  total: number
  failed: number
}

interface AppState {
  scanResult: ScanResult | null
  isScanning: boolean
  scanProgress: ScanProgress | null
  trashProgress: TrashProgress | null
  selectedPaths: Set<string>
  settings: AppSettings
  activeView: ActiveView

  setScanResult: (r: ScanResult) => void
  setScanning: (v: boolean) => void
  setScanProgress: (p: ScanProgress | null) => void
  setTrashProgress: (p: TrashProgress | null) => void
  toggleSelect: (path: string) => void
  selectAll: (category: 'unused' | 'large') => void
  selectPaths: (paths: string[]) => void
  deselectPaths: (paths: string[]) => void
  removePaths: (paths: string[]) => void
  clearSelection: () => void
  setSettings: (s: AppSettings) => void
  setActiveView: (v: ActiveView) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  scanResult: null,
  isScanning: false,
  scanProgress: null,
  trashProgress: null,
  selectedPaths: new Set(),
  settings: DEFAULT_SETTINGS,
  activeView: 'dashboard',

  setScanResult: (r) => set({ scanResult: r }),
  setScanning: (v) => set({ isScanning: v }),
  setScanProgress: (p) => set({ scanProgress: p }),
  setTrashProgress: (p) => set({ trashProgress: p }),

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

  selectPaths: (paths) => {
    const s = new Set(get().selectedPaths)
    paths.forEach((p) => s.add(p))
    set({ selectedPaths: s })
  },

  deselectPaths: (paths) => {
    const s = new Set(get().selectedPaths)
    paths.forEach((p) => s.delete(p))
    set({ selectedPaths: s })
  },

  removePaths: (paths) => {
    const removed = new Set(paths)
    const { scanResult } = get()
    if (!scanResult || removed.size === 0) return
    set({
      scanResult: {
        ...scanResult,
        unused: scanResult.unused.filter((f) => !removed.has(f.path)),
        large: scanResult.large.filter((f) => !removed.has(f.path)),
        duplicates: scanResult.duplicates
          .map((g) => ({ ...g, files: g.files.filter((f) => !removed.has(f.path)) }))
          .filter((g) => g.files.length > 1),
        similarImages: scanResult.similarImages
          .map((g) => ({ ...g, files: g.files.filter((f) => !removed.has(f.path)) }))
          .filter((g) => g.files.length > 0),
      },
    })
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
