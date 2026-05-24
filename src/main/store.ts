// src/main/store.ts
import { createRequire } from 'module'
import type ElectronStore from 'electron-store'
import type { AppSettings } from '../renderer/src/types'
import { DEFAULT_SETTINGS } from '../renderer/src/types'

const _Store = (createRequire(import.meta.url)('electron-store') as { default: typeof ElectronStore }).default
const store = new _Store<{ settings: AppSettings; lastResult: unknown }>({
  defaults: { settings: DEFAULT_SETTINGS, lastResult: null },
})

export default store
