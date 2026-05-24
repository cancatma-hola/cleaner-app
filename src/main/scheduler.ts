// src/main/scheduler.ts
import schedule from 'node-schedule'
import { Notification } from 'electron'
import store from './store'
import type { AppSettings } from '../renderer/src/types'

let job: schedule.Job | null = null

export function setupScheduler(): void {
  const settings = store.get('settings') as AppSettings
  updateSchedule(settings)

  store.onDidChange('settings', (newSettings) => {
    updateSchedule(newSettings as AppSettings)
  })
}

function updateSchedule(settings: AppSettings): void {
  if (job) { job.cancel(); job = null }
  if (!settings.scheduleEnabled) return

  // Weekly: Monday 9am, Monthly: 1st of month 9am
  const cron = settings.scheduleFrequency === 'weekly' ? '0 9 * * 1' : '0 9 1 * *'

  job = schedule.scheduleJob(cron, () => {
    const current = store.get('settings') as AppSettings
    if (current.notificationsEnabled) {
      new Notification({
        title: 'CLEANER',
        body: 'Zamanlanmış tarama tamamlandı — uygulamayı açarak sonuçları görün.',
      }).show()
    }
  })
}
