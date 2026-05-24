// src/main/store.ts
import Store from 'electron-store'
import type { AppSettings } from '../renderer/src/types'
import { DEFAULT_SETTINGS } from '../renderer/src/types'

const store = new Store<{ settings: AppSettings; lastResult: unknown }>({
  defaults: { settings: DEFAULT_SETTINGS, lastResult: null },
})

export default store
