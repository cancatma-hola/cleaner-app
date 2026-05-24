// src/preload/index.d.ts
import type { CleanerAPI } from './index'

declare global {
  interface Window {
    cleaner: CleanerAPI
  }
}
