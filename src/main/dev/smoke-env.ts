// src/main/dev/smoke-env.ts
// Imported first by index.ts. In smoke mode the app runs with a throw-away userData
// directory so the user's real settings are never touched.
import { app } from 'electron'
import { mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

if (process.env.CLEANER_SMOKE_OUT) {
  app.setPath('userData', mkdtempSync(join(tmpdir(), 'cleaner-smoke-')))
}
