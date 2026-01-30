import { execFileSync, spawnSync } from 'child_process'
import * as crypto from 'crypto'
import * as path from 'path'
import type { TmuxSession } from '../types.js'

// Generate safe session name from project path
export const getSessionName = (projectPath: string): string => {
  const basename = path.basename(projectPath)
  // Strict: only allow alphanumeric, dash, underscore
  const sanitized = basename.replace(/[^a-zA-Z0-9_-]/g, '-')
  // Handle collision: append hash of full path
  const hash = crypto.createHash('md5').update(projectPath).digest('hex').slice(0, 6)
  return `${sanitized}-${hash}`
}

// Validate project path for shell safety
export const validateProjectPath = (projectPath: string): boolean => {
  // Reject paths with dangerous characters for shell execution
  // Includes: control chars, backtick, $, \, ", ', ;, |, &, <, >, (, ), newline
  const dangerous = /[\x00-\x1f\x7f`$\\\"';|&<>()]/
  if (dangerous.test(projectPath)) {
    return false
  }
  // Must be absolute path
  if (!path.isAbsolute(projectPath)) {
    return false
  }
  return true
}

// Validate session ID format (Claude uses UUIDs)
export const isValidSessionId = (sessionId: string): boolean => {
  // Claude session IDs are UUIDs: 8-4-4-4-12 hex chars
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(sessionId)
}

// Check if tmux is installed
export const tmuxExists = (): boolean => {
  const result = spawnSync('which', ['tmux'], { stdio: 'ignore' })
  return result.status === 0
}

// List all tmux sessions
export const listSessions = (): TmuxSession[] => {
  const result = spawnSync('tmux', [
    'list-sessions',
    '-F', '#{session_name}|#{session_windows}|#{session_attached}|#{session_created}'
  ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] })

  if (result.status !== 0 || !result.stdout) return []

  return result.stdout.trim().split('\n').filter(Boolean).map(line => {
    const parts = line.split('|')
    if (parts.length !== 4) return null
    const [name, windows, attached, created] = parts
    const createdTimestamp = parseInt(created)
    return {
      name,
      windows: parseInt(windows) || 0,
      attached: attached === '1',
      // Handle NaN - default to now
      created: isNaN(createdTimestamp) ? new Date() : new Date(createdTimestamp * 1000)
    }
  }).filter((s): s is TmuxSession => s !== null)
}

// Check if specific session exists
export const sessionExists = (name: string): boolean => {
  const result = spawnSync('tmux', ['has-session', '-t', name], { stdio: 'ignore' })
  return result.status === 0
}

// Create new tmux session with command
export const createSession = (name: string, cwd: string, command: string): void => {
  const result = spawnSync('tmux', [
    'new-session',
    '-d',           // detached
    '-s', name,     // session name
    '-c', cwd,      // working directory
    'sh', '-c', command  // run via shell
  ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })

  if (result.status !== 0) {
    const stderr = result.stderr || ''
    const error = new Error(`tmux new-session failed: ${stderr}`)
    ;(error as any).stderr = stderr
    throw error
  }
}

// Split pane in existing session
export const splitPane = (sessionName: string, cwd: string, command: string): void => {
  const result = spawnSync('tmux', [
    'split-window',
    '-t', sessionName,
    '-c', cwd,
    'sh', '-c', command  // run via shell
  ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })

  if (result.status !== 0) {
    const stderr = result.stderr || ''
    const error = new Error(`tmux split-window failed: ${stderr}`)
    ;(error as any).stderr = stderr
    throw error
  }

  // Balance panes for even layout
  spawnSync('tmux', ['select-layout', '-t', sessionName, 'tiled'], { stdio: 'ignore' })
}

// Check if session is attached
export const isSessionAttached = (name: string): boolean => {
  const sessions = listSessions()
  const session = sessions.find(s => s.name === name)
  return session?.attached ?? false
}
