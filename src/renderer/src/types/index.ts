// src/renderer/src/types/index.ts
export type Category =
  | 'screenshot'
  | 'download'
  | 'backup'
  | 'cache'
  | 'video'
  | 'document'
  | 'other'

export interface ScannedFile {
  path: string
  name: string
  size: number
  lastAccessed: number   // ms timestamp
  lastModified: number
  created: number
  category: Category
  duplicateGroup?: string
  similarGroup?: string
  isOriginal?: boolean
}

export interface DuplicateGroup {
  hash: string
  files: ScannedFile[]
  wastedBytes: number
}

export interface SimilarGroup {
  id: string
  files: ScannedFile[]
  similarity: number
}

export interface ScanConfig {
  paths: string[]
  excludePatterns: string[]
  unusedThresholdDays: number
  largeSizeThresholdMB: number
  includeHidden: boolean
}

export const DEFAULT_SCAN_CONFIG: ScanConfig = {
  paths: ['/Users'],
  excludePatterns: ['**/node_modules/**', '**/.git/**', '**/Library/Caches/**'],
  unusedThresholdDays: 90,
  largeSizeThresholdMB: 100,
  includeHidden: false,
}

export interface ScanProgress {
  scanned: number
  total: number
  currentPath: string
  phase: 'scanning' | 'hashing' | 'image-hashing' | 'done'
}

export interface ScanResult {
  unused: ScannedFile[]
  duplicates: DuplicateGroup[]
  large: ScannedFile[]
  similarImages: SimilarGroup[]
  totalWastedBytes: number
  scannedAt: number
}

export interface DiskInfo {
  total: number   // bytes
  used: number
  free: number
  byCategory: Record<Category, number>
}

export interface AppSettings {
  scanConfig: ScanConfig
  scheduleEnabled: boolean
  scheduleFrequency: 'weekly' | 'monthly'
  notificationsEnabled: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  scanConfig: DEFAULT_SCAN_CONFIG,
  scheduleEnabled: false,
  scheduleFrequency: 'weekly',
  notificationsEnabled: true,
}

// Window augmentation for renderer — CleanerAPI will be declared in preload
export {}
