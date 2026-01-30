import { appendFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const LOG_FILE = join(homedir(), '.claude-launcher.log')

// Clear log on startup
let initialized = false

export const log = (message: string, data?: unknown): void => {
  if (!initialized) {
    writeFileSync(LOG_FILE, `=== Session started ${new Date().toISOString()} ===\n`)
    initialized = true
  }

  const timestamp = new Date().toISOString()
  let line = `[${timestamp}] ${message}`

  if (data !== undefined) {
    try {
      line += ` ${JSON.stringify(data)}`
    } catch {
      line += ` [unserializable data]`
    }
  }

  appendFileSync(LOG_FILE, line + '\n')
}

export const LOG_FILE_PATH = LOG_FILE
