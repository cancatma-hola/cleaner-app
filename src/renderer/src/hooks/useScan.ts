// src/renderer/src/hooks/useScan.ts
import { useEffect } from 'react'
import { useAppStore } from '../store/app.store'
import type { ScanConfig, ScanProgress } from '../types'

export function useScan() {
  const { setScanning, setScanResult, setScanProgress } = useAppStore()

  useEffect(() => {
    window.cleaner.onProgress((p: unknown) => {
      setScanProgress(p as ScanProgress)
    })
    return () => { window.cleaner.offProgress() }
  }, [setScanProgress])

  const startScan = async (config?: ScanConfig) => {
    setScanning(true)
    setScanProgress({ scanned: 0, total: 0, currentPath: '', phase: 'scanning' })
    try {
      // The main-process store is the source of truth (OS-specific defaults); the renderer
      // copy may still hold the placeholder defaults if settings haven't loaded yet.
      const scanConfig = config ?? (await window.cleaner.getSettings())?.scanConfig ?? useAppStore.getState().settings.scanConfig
      const result = await window.cleaner.startScan(scanConfig)
      setScanResult(result)
    } finally {
      setScanning(false)
      setScanProgress(null)
    }
  }

  const stopScan = async () => {
    await window.cleaner.stopScan()
    setScanning(false)
    setScanProgress(null)
  }

  return { startScan, stopScan }
}
