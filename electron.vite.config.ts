import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          'file-scanner.worker': resolve('electron/workers/file-scanner.worker.ts'),
          'hash.worker': resolve('electron/workers/hash.worker.ts'),
          'image-hash.worker': resolve('electron/workers/image-hash.worker.ts'),
        },
      },
    },
  },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: { plugins: [react()] },
})
