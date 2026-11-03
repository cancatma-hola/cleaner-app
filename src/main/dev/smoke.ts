// src/main/dev/smoke.ts
// UI smoke test: `npm run smoke` (see package.json). Drives the real window, captures
// screenshots into CLEANER_SMOKE_OUT and quits. Never runs a System Cleanup.
//   CLEANER_SMOKE_OUT   output folder for screenshots + logs (enables smoke mode)
//   CLEANER_SMOKE_SCAN  optional folder to run a full scan on
//   CLEANER_SMOKE_TRASH "1" → also moves duplicate copies found in CLEANER_SMOKE_SCAN to the trash
import { app, BrowserWindow } from 'electron'
import { mkdirSync, writeFileSync, appendFileSync } from 'fs'
import { join } from 'path'
import store from '../store'
import type { AppSettings } from '../../renderer/src/types'

export const smokeEnabled = !!process.env.CLEANER_SMOKE_OUT

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function prepareSmoke(): void {
  const scan = process.env.CLEANER_SMOKE_SCAN
  if (!scan) return
  const s = store.get('settings') as AppSettings
  store.set('settings', { ...s, scanConfig: { ...s.scanConfig, paths: [scan] } })
}

export async function runSmoke(win: BrowserWindow): Promise<void> {
  const out = process.env.CLEANER_SMOKE_OUT as string
  mkdirSync(out, { recursive: true })
  const logFile = join(out, 'smoke.log')
  writeFileSync(logFile, '')
  const log = (...a: unknown[]) => {
    const line = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')
    console.log('[smoke]', line)
    appendFileSync(logFile, line + '\n')
  }
  const wc = win.webContents
  wc.on('console-message', (e) => log(`[renderer:${e.level}]`, e.message))

  const js = <T>(code: string): Promise<T> => wc.executeJavaScript(code)
  const shot = async (name: string) => {
    const img = await wc.capturePage()
    writeFileSync(join(out, `${name}.png`), img.toPNG())
    log('shot', name)
  }
  const click = async (text: string) => {
    const ok = await js<boolean>(`(() => {
      const b = [...document.querySelectorAll('button')].find((b) => b.innerText.includes(${JSON.stringify(text)}))
      if (b && !b.disabled) { b.click(); return true }
      return false
    })()`)
    log('click', text, ok ? 'ok' : 'NOT FOUND')
    return ok
  }
  const waitFor = async (cond: string, timeoutMs: number, label: string) => {
    const t0 = Date.now()
    while (Date.now() - t0 < timeoutMs) {
      if (await js<boolean>(`!!(${cond})`)) { log('ready', label, `${Date.now() - t0}ms`); return true }
      await sleep(300)
    }
    log('TIMEOUT', label)
    return false
  }
  const text = () => js<string>('document.body.innerText')

  try {
    if (wc.isLoading()) await new Promise<void>((r) => wc.once('did-finish-load', () => r()))
    await sleep(2500)
    await shot('01-dashboard')

    if (process.env.CLEANER_SMOKE_SCAN) {
      await click('Tam Tarama')
      await waitFor(`document.body.innerText.includes('SON TARAMA')`, 180_000, 'scan')
      await sleep(500)
      await shot('02-dashboard-scanned')
      const views: [string, string][] = [
        ['Kullanılmayanlar', '03-unused'],
        ['Yinelenler', '04-duplicates'],
        ['Büyük Dosyalar', '05-large'],
        ['Benzer Resimler', '06-similar'],
      ]
      for (const [label, name] of views) {
        await click(label)
        await sleep(800)
        await shot(name)
        writeFileSync(join(out, `${name}.txt`), await text())
      }

      if (process.env.CLEANER_SMOKE_TRASH === '1') {
        await click('Yinelenler')
        await sleep(500)
        await click('Tüm Kopyaları Seç')
        await sleep(400)
        await shot('07-duplicates-selected')
        await click('Seçilenleri')
        await sleep(500)
        await waitFor(`!document.body.innerText.includes('taşınıyor')`, 60_000, 'trash')
        await sleep(800)
        await shot('08-duplicates-after-trash')
        writeFileSync(join(out, '08-duplicates-after-trash.txt'), await text())
      }
    }

    await click('Sistem Temizliği')
    await sleep(500)
    await waitFor(`document.body.innerText.includes('Toplam kazanılabilir')`, 30_000, 'sysclean-list')
    await waitFor(`!document.body.innerText.includes('Analiz ediliyor')`, 300_000, 'sysclean-analyze')
    await sleep(500)
    await shot('09-system-clean')
    writeFileSync(join(out, '09-system-clean.txt'), await text())

    await click('Ayarlar')
    await sleep(800)
    await shot('10-settings')
    writeFileSync(join(out, '10-settings.txt'), await text())
    log('DONE')
  } catch (err) {
    log('ERROR', (err as Error).stack ?? String(err))
  } finally {
    app.quit()
  }
}
