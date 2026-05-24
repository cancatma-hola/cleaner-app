// tests/worker-pool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkerPool } from '../src/main/services/worker-pool'

vi.mock('worker_threads', () => ({
  Worker: vi.fn().mockImplementation(function (this: unknown) {
    (this as Record<string, unknown>).on = vi.fn()
    ;(this as Record<string, unknown>).postMessage = vi.fn()
    ;(this as Record<string, unknown>).terminate = vi.fn()
  }),
}))

describe('WorkerPool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates at most maxWorkers workers', async () => {
    const { Worker } = await import('worker_threads')
    const pool = new WorkerPool('fake.js', 2)
    pool.run({ task: 1 })
    pool.run({ task: 2 })
    pool.run({ task: 3 })
    expect(Worker).toHaveBeenCalledTimes(2)
  })

  it('terminateAll calls terminate on all active workers', async () => {
    const terminate = vi.fn()
    const { Worker } = await import('worker_threads')
    ;(Worker as unknown as ReturnType<typeof vi.fn>).mockImplementation(function (this: unknown) {
      (this as Record<string, unknown>).on = vi.fn()
      ;(this as Record<string, unknown>).postMessage = vi.fn()
      ;(this as Record<string, unknown>).terminate = terminate
    })
    const pool = new WorkerPool('fake.js', 2)
    pool.run({ task: 1 })
    pool.terminateAll()
    expect(terminate).toHaveBeenCalled()
  })
})
