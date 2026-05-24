// electron/workers/hash.worker.ts
import { workerData, parentPort } from 'worker_threads'
import { createReadStream } from 'fs'
import { createHash } from 'crypto'
import type { ScannedFile, DuplicateGroup } from '../../src/renderer/src/types'

export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1')
    const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 })
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export function groupDuplicates(filesWithHash: ScannedFile[]): DuplicateGroup[] {
  const groups = new Map<string, ScannedFile[]>()
  for (const f of filesWithHash) {
    if (!f.duplicateGroup) continue
    const group = groups.get(f.duplicateGroup) ?? []
    group.push(f)
    groups.set(f.duplicateGroup, group)
  }

  const result: DuplicateGroup[] = []
  for (const [hash, files] of groups) {
    if (files.length < 2) continue
    const sorted = [...files].sort((a, b) => a.created - b.created)
    sorted[0].isOriginal = true
    result.push({
      hash,
      files: sorted,
      wastedBytes: (files.length - 1) * files[0].size,
    })
  }
  return result
}

// Worker entry
if (workerData) {
  const { files } = workerData as { files: ScannedFile[] }
  ;(async () => {
    const hashed: ScannedFile[] = []
    for (let i = 0; i < files.length; i++) {
      try {
        const h = await hashFile(files[i].path)
        hashed.push({ ...files[i], duplicateGroup: h })
        if (i % 50 === 0) {
          parentPort?.postMessage({ type: 'progress', hashed: i + 1, total: files.length })
        }
      } catch { hashed.push(files[i]) }
    }
    const groups = groupDuplicates(hashed)
    parentPort?.postMessage({ type: 'result', groups, files: hashed })
  })()
}
