// src/renderer/src/hooks/useScan.ts
import { useEffect } from 'react'
import { useAppStore } from '../store/app.store'
import type { ScanConfig, ScanProgress } from '../types'

export function useScan() {
  const { setScanning, setScanResult, setScanProgress, settings } = useAppStore()

  useEffect(() => {
    const unsubscribe = window.cleaner.onProgress((p: unknown) => {
      setScanProgress(p as ScanProgress)
    })
    return () => { unsubscribe?.() }
  }, [setScanProgress])

  const startScan = async (config?: ScanConfig) => {
    setScanning(true)
    setScanProgress({ scanned: 0, total: 0, currentPath: '', phase: 'scanning' })
    try {
      const result = await window.cleaner.startScan(config ?? settings.scanConfig)
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
