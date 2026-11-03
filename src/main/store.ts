// src/main/store.ts
import Store from 'electron-store'
import type { AppSettings } from '../renderer/src/types'
import { defaultSettings } from './platform'

// Defaults depend on the OS (scan roots + exclusion rules). Already-saved settings win.
const store = new Store<{ settings: AppSettings; lastResult: unknown }>({
  defaults: { settings: defaultSettings(), lastResult: null },
})

export default store
