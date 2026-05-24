// src/main/services/worker-pool.ts
import { Worker } from 'worker_threads'
import { EventEmitter } from 'events'
import { cpus } from 'os'

export class WorkerPool extends EventEmitter {
  private workers: Worker[] = []
  private queue: unknown[] = []
  private readonly maxWorkers: number
  private readonly workerPath: string

  constructor(workerPath: string, maxWorkers = Math.min(4, cpus().length)) {
    super()
    this.workerPath = workerPath
    this.maxWorkers = maxWorkers
  }

  run(data: unknown): void {
    if (this.workers.length < this.maxWorkers) {
      this._spawn(data)
    } else {
      this.queue.push(data)
    }
  }

  private _spawn(data: unknown): void {
    const worker = new Worker(this.workerPath, { workerData: data })
    this.workers.push(worker)

    worker.on('message', (msg) => this.emit('message', msg))
    worker.on('error', (err) => this.emit('error', err))
    worker.on('exit', () => {
      this.workers = this.workers.filter((w) => w !== worker)
      if (this.queue.length > 0) {
        this._spawn(this.queue.shift())
      } else if (this.workers.length === 0) {
        this.emit('done')
      }
    })
  }

  terminateAll(): void {
    this.workers.forEach((w) => w.terminate())
    this.workers = []
    this.queue = []
  }
}
