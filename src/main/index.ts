import './dev/smoke-env' // must stay first: isolates userData for smoke runs before the store loads
import { app, BrowserWindow, nativeTheme, protocol, net } from 'electron'
import { join, extname } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerScannerIpc } from './ipc/scanner.ipc'
import { registerTrashIpc } from './ipc/trash.ipc'
import { registerStoreIpc } from './ipc/store.ipc'
import { registerSystemIpc } from './ipc/system.ipc'
import { setupScheduler } from './scheduler'
import { isMac } from './platform'
import { smokeEnabled, prepareSmoke, runSmoke } from './dev/smoke'

// Local image previews. file:// is blocked from the dev-server origin and breaks on
// Windows paths ("C:\..."), so previews go through a dedicated, image-only scheme.
protocol.registerSchemesAsPrivileged([
  { scheme: 'cleaner-file', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
])
const PREVIEW_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.avif', '.heic'])

function registerPreviewProtocol(): void {
  protocol.handle('cleaner-file', (req) => {
    const p = new URL(req.url).searchParams.get('p')
    // UNC paths are refused: opening \\host\share would trigger an SMB/NTLM handshake.
    if (!p || p.startsWith('\\\\') || p.startsWith('//') || !PREVIEW_EXTS.has(extname(p).toLowerCase())) {
      return new Response('forbidden', { status: 403 })
    }
    return net.fetch(pathToFileURL(p).toString())
  })
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    // hiddenInset is macOS-only; Windows/Linux keep the native (dark) frame.
    ...(isMac ? { titleBarStyle: 'hiddenInset' as const } : {}),
    title: 'Cleaner',
    backgroundColor: '#0a0a0a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (is.dev && !smokeEnabled) mainWindow.webContents.openDevTools()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return mainWindow
}

app.whenReady().then(() => {
  // Set app user model id for windows (must match electron-builder appId for notifications)
  electronApp.setAppUserModelId('com.electron.app')
  nativeTheme.themeSource = 'dark'

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerPreviewProtocol()
  if (smokeEnabled) prepareSmoke()

  const mainWindow = createWindow()
  registerScannerIpc(mainWindow)
  registerTrashIpc()
  registerStoreIpc()
  registerSystemIpc()
  setupScheduler()

  if (smokeEnabled) void runSmoke(mainWindow)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
