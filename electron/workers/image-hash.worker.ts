// electron/workers/image-hash.worker.ts
import { workerData, parentPort } from 'worker_threads'
import sharp from 'sharp'
import type { ScannedFile, SimilarGroup } from '../../src/renderer/src/types'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.bmp', '.gif'])

export async function perceptualHash(imagePath: string): Promise<string> {
  // 8x8 grayscale average hash (aHash) — 64-bit binary string
  const { data } = await sharp(imagePath)
    .resize(8, 8, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const avg = data.reduce((s: number, v: number) => s + v, 0) / data.length
  return Array.from(data).map((v) => ((v as number) >= avg ? '1' : '0')).join('')
}

export function hammingDistance(a: string, b: string): number {
  let dist = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) dist++
  return dist
}

export function similarity(a: string, b: string): number {
  return 1 - hammingDistance(a, b) / 64
}

export function groupSimilar(
  entries: { file: ScannedFile; hash: string }[],
  threshold = 0.9,
): SimilarGroup[] {
  const groups: SimilarGroup[] = []
  const used = new Set<string>()

  for (let i = 0; i < entries.length; i++) {
    if (used.has(entries[i].file.path)) continue
    const group: ScannedFile[] = [entries[i].file]
    let minSim = 1

    for (let j = i + 1; j < entries.length; j++) {
      if (used.has(entries[j].file.path)) continue
      const sim = similarity(entries[i].hash, entries[j].hash)
      if (sim >= threshold) {
        group.push(entries[j].file)
        used.add(entries[j].file.path)
        minSim = Math.min(minSim, sim)
      }
    }

    if (group.length > 1) {
      used.add(entries[i].file.path)
      groups.push({ id: `sim-${i}`, files: group, similarity: minSim })
    }
  }
  return groups
}

// Worker entry
if (workerData) {
  const { files } = workerData as { files: ScannedFile[] }
  const imageFiles = files.filter((f) => {
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'))
    return IMAGE_EXTS.has(ext)
  })

  ;(async () => {
    const entries: { file: ScannedFile; hash: string }[] = []
    for (let i = 0; i < imageFiles.length; i++) {
      try {
        const hash = await perceptualHash(imageFiles[i].path)
        entries.push({ file: imageFiles[i], hash })
        if (i % 20 === 0) {
          parentPort?.postMessage({ type: 'progress', hashed: i + 1, total: imageFiles.length })
        }
      } catch { /* skip unreadable images */ }
    }
    const groups = groupSimilar(entries)
    parentPort?.postMessage({ type: 'result', groups })
  })()
}
