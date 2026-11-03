// src/main/services/system-clean.ts
// "Sistem Temizliği": temp folders, browser caches, crash dumps, update caches, recycle bin.
//
// Safety model
//  - The renderer only sends target IDs; every path is resolved here from a fixed list.
//  - Only the *contents* of a target root are deleted, never the root itself.
//  - Symlinks / junctions are never followed nor deleted (a junction inside a cache folder
//    could otherwise lead the walker into the user's real data).
//  - Every candidate path is re-checked to be inside its root; roots themselves are checked
//    against a deny-list (drive root, home dir, Windows dir, Program Files ...).
//  - Files younger than `minAgeHours` are kept (in-use installer / app temp files).
//  - Locked files (EBUSY/EPERM) are simply counted as "failed" and left in place.
import { lstat, readdir, rmdir, unlink, stat, realpath } from 'fs/promises'
import { join, resolve, relative, isAbsolute, parse, dirname } from 'path'
import { homedir } from 'os'
import { execFile } from 'child_process'
import type { CleanTarget, CleanStats, CleanOutcome, CleanGroup } from '../../renderer/src/types'

export interface CleanTargetDef {
  id: string
  label: string
  description: string
  group: CleanGroup
  /** Candidate roots; non-existing ones are filtered out by listTargets(). */
  roots: string[]
  minAgeHours?: number
  requiresAdmin?: boolean
  warning?: string
  /** Optional custom cleaner (e.g. Windows Recycle Bin via the Shell). */
  customClean?: () => Promise<void>
  defaultSelected?: boolean
}

const HOUR = 60 * 60 * 1000

// ---------------------------------------------------------------- path safety

function norm(p: string, platform = process.platform): string {
  const r = resolve(p).replace(/[\\/]+$/, '')
  return platform === 'win32' ? r.toLowerCase() : r
}

export function forbiddenRoots(platform = process.platform): Set<string> {
  const home = homedir()
  const list = [parse(home).root, home, dirname(home)]
  if (platform === 'win32') {
    const sysRoot = process.env.SystemRoot ?? 'C:\\Windows'
    list.push(
      sysRoot,
      join(sysRoot, 'System32'),
      process.env.ProgramFiles ?? 'C:\\Program Files',
      process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)',
      process.env.ProgramData ?? 'C:\\ProgramData',
      process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local'),
      process.env.APPDATA ?? join(home, 'AppData', 'Roaming'),
      join(home, 'AppData'),
    )
  } else {
    list.push('/', '/Users', '/home', '/System', '/Library', '/usr', join(home, 'Library'))
  }
  return new Set(list.map((p) => norm(p, platform)))
}

export function isSafeRoot(root: string, platform = process.platform): boolean {
  if (!isAbsolute(root)) return false
  const n = norm(root, platform)
  if (forbiddenRoots(platform).has(n)) return false
  // Require at least two path segments below the drive / filesystem root.
  const rest = n.slice(parse(n).root.length)
  return rest.split(/[\\/]/).filter(Boolean).length >= 2
}

export function isInside(root: string, p: string): boolean {
  const r = relative(root, p)
  return r !== '' && !r.startsWith('..') && !isAbsolute(r)
}

// ---------------------------------------------------------------- walker

export interface ProcessOptions {
  minAgeMs: number
  dryRun: boolean
  now?: number
}

export interface ProcessStats extends CleanStats {
  freedBytes: number
  deleted: number
}

function emptyStats(): ProcessStats {
  return { bytes: 0, files: 0, skippedYoung: 0, failed: 0, freedBytes: 0, deleted: 0 }
}

/** Measures (dryRun) or deletes the contents of `root`. The root itself is kept. */
export async function processRoot(root: string, opts: ProcessOptions): Promise<ProcessStats> {
  const stats = emptyStats()
  if (!isSafeRoot(root)) throw new Error(`Güvensiz hedef reddedildi: ${root}`)
  const now = opts.now ?? Date.now()
  const rootAbs = resolve(root)
  try {
    if ((await lstat(rootAbs)).isSymbolicLink()) return stats // never follow a linked root
  } catch {
    return stats
  }

  // Returns true when `dir` is empty afterwards (so the caller may remove it).
  const walk = async (dir: string): Promise<boolean> => {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { stats.failed++; return false }
    let remaining = 0
    for (const e of entries) {
      const full = join(dir, e.name)
      if (!isInside(rootAbs, full) || e.isSymbolicLink()) { remaining++; continue }
      if (e.isDirectory()) {
        const empty = await walk(full)
        if (empty && !opts.dryRun) {
          // A freshly created empty folder may be about to be used (installer / app temp dir).
          let young = false
          if (opts.minAgeMs > 0) {
            try {
              const ds = await lstat(full)
              young = now - Math.max(ds.mtimeMs, ds.birthtimeMs || 0) < opts.minAgeMs
            } catch { young = true }
          }
          if (young) remaining++
          else {
            try { await rmdir(full) } catch { remaining++ }
          }
        } else if (!empty) {
          remaining++
        }
      } else if (e.isFile()) {
        if (e.name.toLowerCase() === 'desktop.ini') { remaining++; continue } // folder config, keep
        let st
        try { st = await lstat(full) } catch { stats.failed++; remaining++; continue }
        // Young = created OR modified recently (installers extract files with old mtimes).
        const age = now - Math.max(st.mtimeMs, st.birthtimeMs || 0)
        if (opts.minAgeMs > 0 && age < opts.minAgeMs) { stats.skippedYoung++; remaining++; continue }
        stats.files++
        stats.bytes += st.size
        if (!opts.dryRun) {
          try {
            await unlink(full)
            stats.deleted++
            stats.freedBytes += st.size
          } catch {
            stats.failed++
            remaining++
          }
        }
      } else {
        remaining++
      }
    }
    return remaining === 0
  }

  await walk(rootAbs)
  return stats
}

function mergeStats(a: ProcessStats, b: ProcessStats): ProcessStats {
  return {
    bytes: a.bytes + b.bytes,
    files: a.files + b.files,
    skippedYoung: a.skippedYoung + b.skippedYoung,
    failed: a.failed + b.failed,
    freedBytes: a.freedBytes + b.freedBytes,
    deleted: a.deleted + b.deleted,
  }
}

// ---------------------------------------------------------------- target catalogue

async function exists(p: string): Promise<boolean> {
  try { return (await stat(p)).isDirectory() } catch { return false }
}

async function listSubdirs(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => join(dir, e.name))
  } catch { return [] }
}

/** Chromium profiles: "Default", "Profile 1", "Guest Profile", "System Profile" ... */
async function chromiumCacheRoots(userDataDir: string): Promise<string[]> {
  const roots: string[] = []
  for (const sub of ['ShaderCache', 'GrShaderCache', 'GraphiteDawnCache']) roots.push(join(userDataDir, sub))
  for (const profile of await listSubdirs(userDataDir)) {
    for (const sub of ['Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache']) {
      roots.push(join(profile, sub))
    }
  }
  return roots
}

async function firefoxCacheRoots(profilesDir: string): Promise<string[]> {
  return (await listSubdirs(profilesDir)).map((p) => join(p, 'cache2'))
}

function execFileP(cmd: string, args: string[]): Promise<string> {
  return new Promise((res, rej) => {
    execFile(cmd, args, { windowsHide: true, timeout: 120_000 }, (err, stdout) => (err ? rej(err) : res(stdout)))
  })
}

async function currentUserSid(): Promise<string | null> {
  try {
    const out = await execFileP('whoami', ['/user', '/fo', 'csv', '/nh'])
    return out.match(/S-1-[\d-]+/)?.[0] ?? null
  } catch { return null }
}

async function windowsRecycleBinRoots(): Promise<string[]> {
  const sid = await currentUserSid()
  if (!sid) return []
  const roots: string[] = []
  for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
    const p = `${letter}:\\$Recycle.Bin\\${sid}`
    if (await exists(p)) roots.push(p)
  }
  return roots
}

const BROWSER_WARNING = 'Tarayıcı açıksa kullanımdaki dosyalar atlanır. Çerezler, şifreler ve geçmiş silinmez.'

async function windowsTargets(): Promise<CleanTargetDef[]> {
  const home = homedir()
  const LA = process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
  const PD = process.env.ProgramData ?? 'C:\\ProgramData'
  const WINDIR = process.env.SystemRoot ?? 'C:\\Windows'

  const browsers: { id: string; label: string; userData: string }[] = [
    { id: 'chrome', label: 'Google Chrome', userData: join(LA, 'Google', 'Chrome', 'User Data') },
    { id: 'edge', label: 'Microsoft Edge', userData: join(LA, 'Microsoft', 'Edge', 'User Data') },
    { id: 'brave', label: 'Brave', userData: join(LA, 'BraveSoftware', 'Brave-Browser', 'User Data') },
  ]

  const defs: CleanTargetDef[] = [
    {
      id: 'user-temp',
      label: 'Geçici dosyalar (kullanıcı)',
      description: '%TEMP% klasörü — kurulum ve uygulama artıkları',
      group: 'system',
      // Fixed location — %TEMP% is user-overridable and could point at real data.
      roots: [join(LA, 'Temp')],
      minAgeHours: 24,
      defaultSelected: true,
    },
    {
      id: 'windows-temp',
      label: 'Windows geçici dosyaları',
      description: 'C:\\Windows\\Temp',
      group: 'system',
      roots: [join(WINDIR, 'Temp')],
      minAgeHours: 24,
      requiresAdmin: true,
      defaultSelected: true,
    },
    {
      id: 'crash-reports',
      label: 'Hata raporları ve döküm dosyaları',
      description: 'Windows Hata Bildirimi (WER) ve uygulama çökme dökümleri',
      group: 'system',
      roots: [
        join(LA, 'CrashDumps'),
        join(LA, 'Microsoft', 'Windows', 'WER', 'ReportArchive'),
        join(LA, 'Microsoft', 'Windows', 'WER', 'ReportQueue'),
        join(PD, 'Microsoft', 'Windows', 'WER', 'ReportArchive'),
        join(PD, 'Microsoft', 'Windows', 'WER', 'ReportQueue'),
      ],
      defaultSelected: true,
    },
    {
      id: 'shader-cache',
      label: 'Grafik (shader) önbelleği',
      description: 'DirectX / NVIDIA / AMD shader önbelleği — gerektiğinde yeniden oluşturulur',
      group: 'system',
      roots: [
        join(LA, 'D3DSCache'),
        join(LA, 'NVIDIA', 'DXCache'),
        join(LA, 'NVIDIA', 'GLCache'),
        join(LA, 'AMD', 'DxCache'),
        join(LA, 'AMD', 'DxcCache'),
      ],
      defaultSelected: true,
    },
    {
      id: 'windows-update',
      label: 'Windows Update indirme önbelleği',
      description: 'Kurulmuş güncellemelerin indirilmiş paketleri',
      group: 'system',
      roots: [join(WINDIR, 'SoftwareDistribution', 'Download')],
      minAgeHours: 24,
      requiresAdmin: true,
      warning: 'Bir güncelleme şu an iniyorsa önce bitmesini bekleyin.',
      defaultSelected: true,
    },
    ...(await Promise.all(
      browsers.map(async (b) => ({
        id: `browser-${b.id}`,
        label: `${b.label} önbelleği`,
        description: 'Önbellek, kod önbelleği ve GPU önbelleği (tüm profiller)',
        group: 'browser' as const,
        roots: await chromiumCacheRoots(b.userData),
        warning: BROWSER_WARNING,
        defaultSelected: true,
      })),
    )),
    {
      id: 'browser-firefox',
      label: 'Mozilla Firefox önbelleği',
      description: 'cache2 klasörü (tüm profiller)',
      group: 'browser',
      roots: await firefoxCacheRoots(join(LA, 'Mozilla', 'Firefox', 'Profiles')),
      warning: BROWSER_WARNING,
      defaultSelected: true,
    },
    {
      id: 'dev-npm',
      label: 'npm önbelleği',
      description: '`npm cache clean --force` ile aynı — paketler gerekince yeniden iner',
      group: 'developer',
      roots: [join(LA, 'npm-cache', '_cacache')],
    },
    {
      id: 'dev-pip',
      label: 'pip önbelleği',
      description: 'Python paket indirme önbelleği',
      group: 'developer',
      roots: [join(LA, 'pip', 'cache'), join(LA, 'pip', 'Cache')],
    },
    {
      id: 'dev-yarn',
      label: 'Yarn önbelleği',
      description: 'Yarn paket önbelleği',
      group: 'developer',
      roots: [join(LA, 'Yarn', 'Cache')],
    },
    {
      id: 'dev-electron',
      label: 'Electron / electron-builder önbelleği',
      description: 'İndirilmiş Electron ikilileri ve paketleme araçları',
      group: 'developer',
      roots: [join(LA, 'electron', 'Cache'), join(LA, 'electron-builder', 'Cache')],
    },
    {
      id: 'recycle-bin',
      label: 'Geri Dönüşüm Kutusu',
      description: 'Tüm sürücülerdeki Geri Dönüşüm Kutusu (yalnız sizin hesabınız)',
      group: 'trash',
      roots: await windowsRecycleBinRoots(),
      warning: 'Geri Dönüşüm Kutusu boşaltıldıktan sonra dosyalar geri alınamaz.',
      customClean: async () => {
        await execFileP('powershell.exe', [
          '-NoProfile', '-NonInteractive', '-Command',
          'Clear-RecycleBin -Force -ErrorAction SilentlyContinue',
        ])
      },
      defaultSelected: true,
    },
  ]
  return defs
}

function macTargets(): CleanTargetDef[] {
  const home = homedir()
  return [
    {
      id: 'user-caches', label: 'Uygulama önbellekleri', description: '~/Library/Caches',
      group: 'system', roots: [join(home, 'Library', 'Caches')], minAgeHours: 24,
      warning: 'Açık uygulamaların önbellekleri yeniden oluşturulur.', defaultSelected: true,
    },
    {
      id: 'user-logs', label: 'Uygulama günlükleri', description: '~/Library/Logs',
      group: 'system', roots: [join(home, 'Library', 'Logs')], defaultSelected: true,
    },
    {
      id: 'dev-npm', label: 'npm önbelleği', description: '~/.npm/_cacache',
      group: 'developer', roots: [join(home, '.npm', '_cacache')],
    },
    {
      id: 'trash', label: 'Çöp Kutusu', description: '~/.Trash',
      group: 'trash', roots: [join(home, '.Trash')],
      warning: 'Çöp boşaltıldıktan sonra dosyalar geri alınamaz.', defaultSelected: true,
    },
  ]
}

function linuxTargets(): CleanTargetDef[] {
  const home = homedir()
  return [
    {
      id: 'user-cache', label: 'Uygulama önbellekleri', description: '~/.cache',
      group: 'system', roots: [join(home, '.cache')], minAgeHours: 24, defaultSelected: true,
    },
    {
      id: 'dev-npm', label: 'npm önbelleği', description: '~/.npm/_cacache',
      group: 'developer', roots: [join(home, '.npm', '_cacache')],
    },
    {
      id: 'trash', label: 'Çöp Kutusu', description: '~/.local/share/Trash',
      group: 'trash',
      roots: [join(home, '.local', 'share', 'Trash', 'files'), join(home, '.local', 'share', 'Trash', 'info')],
      defaultSelected: true,
    },
  ]
}

let catalogue: Promise<CleanTargetDef[]> | null = null

async function buildCatalogue(): Promise<CleanTargetDef[]> {
  const raw =
    process.platform === 'win32' ? await windowsTargets()
      : process.platform === 'darwin' ? macTargets()
        : linuxTargets()
  const out: CleanTargetDef[] = []
  for (const def of raw) {
    const roots: string[] = []
    for (const r of def.roots) {
      if (!(await exists(r))) continue
      // Resolve 8.3 short names / linked roots before the deny-list check.
      let real: string
      try { real = await realpath(r) } catch { continue }
      if (isSafeRoot(r) && isSafeRoot(real) && !roots.includes(real)) roots.push(real)
    }
    if (roots.length > 0) out.push({ ...def, roots })
  }
  return out
}

export function getCatalogue(refresh = false): Promise<CleanTargetDef[]> {
  if (!catalogue || refresh) catalogue = buildCatalogue()
  return catalogue
}

export function toPublic(def: CleanTargetDef): CleanTarget {
  return {
    id: def.id,
    label: def.label,
    description: def.description,
    group: def.group,
    roots: def.roots,
    minAgeHours: def.minAgeHours ?? 0,
    requiresAdmin: def.requiresAdmin ?? false,
    warning: def.warning,
    defaultSelected: def.defaultSelected ?? false,
  }
}

export async function listTargets(): Promise<CleanTarget[]> {
  return (await getCatalogue(true)).map(toPublic)
}

async function findTarget(id: string): Promise<CleanTargetDef> {
  const def = (await getCatalogue()).find((d) => d.id === id)
  if (!def) throw new Error(`Bilinmeyen temizlik hedefi: ${id}`)
  return def
}

async function runRoots(def: CleanTargetDef, dryRun: boolean): Promise<ProcessStats> {
  let total = emptyStats()
  const minAgeMs = (def.minAgeHours ?? 0) * HOUR
  for (const r of def.roots) {
    try {
      total = mergeStats(total, await processRoot(r, { minAgeMs, dryRun }))
    } catch {
      total.failed++
    }
  }
  return total
}

export async function analyzeTarget(id: string): Promise<CleanStats> {
  const s = await runRoots(await findTarget(id), true)
  return { bytes: s.bytes, files: s.files, skippedYoung: s.skippedYoung, failed: s.failed }
}

export async function cleanTarget(id: string): Promise<CleanOutcome> {
  const def = await findTarget(id)
  if (def.customClean) {
    const before = await runRoots(def, true)
    let error: string | undefined
    try { await def.customClean() } catch (err) { error = (err as Error).message }
    const after = await runRoots(def, true)
    return {
      id,
      freedBytes: Math.max(0, before.bytes - after.bytes),
      deleted: Math.max(0, before.files - after.files),
      failed: after.files,
      skippedYoung: 0,
      error,
    }
  }
  const s = await runRoots(def, false)
  return { id, freedBytes: s.freedBytes, deleted: s.deleted, failed: s.failed, skippedYoung: s.skippedYoung }
}
