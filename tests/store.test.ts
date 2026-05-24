// tests/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../src/renderer/src/store/app.store'
import type { ScanResult } from '../src/renderer/src/types'

const mockResult: ScanResult = {
  unused: [
    { path: '/a.txt', name: 'a.txt', size: 1000, lastAccessed: 0, lastModified: 0, created: 0, category: 'document' },
  ],
  duplicates: [],
  large: [],
  similarImages: [],
  totalWastedBytes: 0,
  scannedAt: Date.now(),
}

describe('useAppStore', () => {
  beforeEach(() => useAppStore.getState().reset())

  it('setScanResult updates result', () => {
    useAppStore.getState().setScanResult(mockResult)
    expect(useAppStore.getState().scanResult?.unused).toHaveLength(1)
  })

  it('toggleSelect adds and removes path', () => {
    useAppStore.getState().toggleSelect('/a.txt')
    expect(useAppStore.getState().selectedPaths.has('/a.txt')).toBe(true)
    useAppStore.getState().toggleSelect('/a.txt')
    expect(useAppStore.getState().selectedPaths.has('/a.txt')).toBe(false)
  })

  it('selectAll adds all paths from category', () => {
    useAppStore.getState().setScanResult(mockResult)
    useAppStore.getState().selectAll('unused')
    expect(useAppStore.getState().selectedPaths.has('/a.txt')).toBe(true)
  })

  it('clearSelection empties selectedPaths', () => {
    useAppStore.getState().toggleSelect('/a.txt')
    useAppStore.getState().clearSelection()
    expect(useAppStore.getState().selectedPaths.size).toBe(0)
  })
})
