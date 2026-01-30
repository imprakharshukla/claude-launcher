import { existsSync, writeFileSync, mkdtempSync } from 'fs'
import { spawn } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import type { TerminalConfig } from '../types.js'
import {
  tmuxExists,
  getSessionName,
  validateProjectPath,
  isValidSessionId,
  createSession,
  splitPane,
  isSessionAttached
} from './tmux.js'

const TERMINALS: TerminalConfig[] = [
  { name: 'ghostty', execFlag: '-e' },
  { name: 'wezterm', execFlag: 'start --' },
  { name: 'kitty', execFlag: '-e' },
  { name: 'alacritty', execFlag: '-e' },
]

const findExecutable = (cmd: string): boolean => {
  const paths = (process.env.PATH || '').split(':')
  return paths.some(p => {
    try {
      return existsSync(join(p, cmd))
    } catch {
      return false
    }
  })
}

// Cache the terminal detection result
let cachedTerminal: TerminalConfig | null | undefined = undefined

export const detectTerminal = (): TerminalConfig | null => {
  if (cachedTerminal !== undefined) {
    return cachedTerminal
  }

  for (const terminal of TERMINALS) {
    if (findExecutable(terminal.name)) {
      cachedTerminal = terminal
      return terminal
    }
  }

  cachedTerminal = null
  return null
}

// Shell-escape a string for use in single quotes
const shellEscape = (str: string): string => {
  return str.replace(/'/g, "'\\''")
}

// Spawn terminal with array of command args
export const spawnTerminalWithArgs = (terminal: TerminalConfig, commandArgs: string[]): void => {
  if (!terminal.execFlag) {
    throw new Error(`Terminal ${terminal.name} not properly configured`)
  }

  // Escape each arg for shell and join
  const commandStr = commandArgs.map(arg =>
    `'${arg.replace(/'/g, "'\\''")}'`
  ).join(' ')

  if (terminal.name === 'ghostty') {
    spawn('ghostty', ['-e', 'sh', '-c', commandStr], {
      detached: true,
      stdio: 'ignore'
    }).unref()
    return
  }

  // For other terminals (kitty, alacritty, wezterm)
  const args = terminal.execFlag.split(' ')
  args.push('sh', '-c', commandStr)
  spawn(terminal.name, args, {
    detached: true,
    stdio: 'ignore'
  }).unref()
}

// Direct terminal launch (fallback when tmux unavailable)
const spawnTerminalDirect = (terminal: TerminalConfig, project: string, command: string): void => {
  const escapedProject = shellEscape(project)
  const fullCommand = `cd '${escapedProject}' && ${command}`
  spawnTerminalWithArgs(terminal, ['sh', '-c', fullCommand])
}

// Main launch function - uses tmux if available
export const launchWithTmux = (project: string, command: string): void => {
  // Validate project path first
  if (!validateProjectPath(project)) {
    throw new Error(`Invalid project path: ${project}`)
  }

  const terminal = detectTerminal()
  if (!terminal) throw new Error('No terminal found')

  // Check if tmux is available
  if (!tmuxExists()) {
    // Fall back to direct terminal launch
    spawnTerminalDirect(terminal, project, command)
    return
  }

  const sessionName = getSessionName(project)

  // Try to create session first (atomic operation)
  try {
    createSession(sessionName, project, command)
    // Success - new session created, attach to it
    spawnTerminalWithArgs(terminal, ['tmux', 'attach', '-t', sessionName])
    return
  } catch (e: unknown) {
    // Check if it's a "duplicate session" error (race condition)
    const msg = e instanceof Error ? e.message : String(e)
    const stderr = (e as any)?.stderr?.toString() || ''

    // tmux returns "duplicate session: name" when session exists
    if (!msg.includes('duplicate session') && !stderr.includes('duplicate session')) {
      // Not a race condition - re-throw
      throw e
    }
    // Session exists, continue to split
  }

  // Session exists - split pane
  try {
    splitPane(sessionName, project, command)
  } catch (e: unknown) {
    // Split failed - session might have been killed
    // Try creating again as last resort
    try {
      createSession(sessionName, project, command)
      spawnTerminalWithArgs(terminal, ['tmux', 'attach', '-t', sessionName])
      return
    } catch {
      // Give up and fall back to direct launch
      spawnTerminalDirect(terminal, project, command)
      return
    }
  }

  // Attach if session is not attached anywhere
  if (!isSessionAttached(sessionName)) {
    spawnTerminalWithArgs(terminal, ['tmux', 'attach', '-t', sessionName])
  }
}

// Common flags for all claude launches
const CLAUDE_FLAGS = '--dangerously-skip-permissions'

// Resume a session
export const launchResume = (sessionId: string, project: string): void => {
  // Validate session ID to prevent command injection
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session ID format: ${sessionId}`)
  }
  const command = `claude ${CLAUDE_FLAGS} --resume ${sessionId}`
  launchWithTmux(project, command)
}

// Track temp files for cleanup
const tempFiles: string[] = []

// Cleanup temp files on process exit
const cleanupTempFiles = () => {
  for (const file of tempFiles) {
    try {
      const { unlinkSync, rmdirSync } = require('fs')
      const { dirname } = require('path')
      unlinkSync(file)
      rmdirSync(dirname(file))
    } catch {
      // Ignore cleanup errors
    }
  }
}
process.on('exit', cleanupTempFiles)
process.on('SIGINT', () => { cleanupTempFiles(); process.exit(0) })
process.on('SIGTERM', () => { cleanupTempFiles(); process.exit(0) })

// Launch with context (fork)
export const launchWithContext = (project: string, context: string): void => {
  // Write context to temp file (safe - generated path)
  const tmpDir = mkdtempSync(join(tmpdir(), 'claude-launcher-'))
  const contextFile = join(tmpDir, 'context.txt')
  writeFileSync(contextFile, context)
  tempFiles.push(contextFile)

  // Schedule cleanup after delay (give claude time to read the file)
  setTimeout(() => {
    try {
      const { unlinkSync, rmdirSync } = require('fs')
      unlinkSync(contextFile)
      rmdirSync(tmpDir)
      const idx = tempFiles.indexOf(contextFile)
      if (idx >= 0) tempFiles.splice(idx, 1)
    } catch {
      // Ignore errors - will be cleaned up on exit
    }
  }, 10000) // 10 second delay

  // Command uses the generated temp file path (path is safe - generated by mkdtemp)
  const command = `claude ${CLAUDE_FLAGS} -p "$(cat '${contextFile}')"`
  launchWithTmux(project, command)
}

// Launch fresh session
export const launchFresh = (project: string): void => {
  launchWithTmux(project, `claude ${CLAUDE_FLAGS}`)
}

// Launch directly in Ghostty (no tmux)
export const launchDirectGhostty = (project: string, command: string): void => {
  if (!validateProjectPath(project)) {
    throw new Error(`Invalid project path: ${project}`)
  }
  const terminal = detectTerminal()
  if (!terminal) throw new Error('No terminal found')

  spawnTerminalDirect(terminal, project, command)
}

// Resume session directly in Ghostty (no tmux)
export const launchResumeDirectGhostty = (sessionId: string, project: string): void => {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session ID format: ${sessionId}`)
  }
  const command = `claude ${CLAUDE_FLAGS} --resume ${sessionId}`
  launchDirectGhostty(project, command)
}
