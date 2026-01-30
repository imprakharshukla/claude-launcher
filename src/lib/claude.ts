import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join, basename } from 'path'
import type { HistoryEntry, Session } from '../types.js'

export const CLAUDE_DIR = join(homedir(), '.claude')
export const HISTORY_PATH = join(CLAUDE_DIR, 'history.jsonl')
export const PROJECTS_DIR = join(CLAUDE_DIR, 'projects')

export const claudeExists = (): boolean => {
  return existsSync(HISTORY_PATH)
}

export const parseHistoryFile = (): HistoryEntry[] => {
  if (!existsSync(HISTORY_PATH)) {
    return []
  }

  const content = readFileSync(HISTORY_PATH, 'utf-8')
  const entries: HistoryEntry[] = []

  for (const line of content.split('\n')) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line) as HistoryEntry
      // Only include entries with sessionId
      if (entry.sessionId && entry.display) {
        entries.push(entry)
      }
    } catch {
      // Skip corrupt lines
      continue
    }
  }

  return entries
}

export const groupIntoSessions = (entries: HistoryEntry[]): Session[] => {
  const sessionMap = new Map<string, HistoryEntry[]>()

  for (const entry of entries) {
    const existing = sessionMap.get(entry.sessionId) || []
    existing.push(entry)
    sessionMap.set(entry.sessionId, existing)
  }

  const sessions: Session[] = []

  for (const [id, messages] of sessionMap) {
    // Sort messages by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp)

    const lastEntry = messages[messages.length - 1]
    const project = lastEntry.project

    sessions.push({
      id,
      project,
      projectName: basename(project),
      lastMessage: lastEntry.display,
      messageCount: messages.length,
      lastActive: new Date(lastEntry.timestamp),
      messages
    })
  }

  // Sort sessions by last active, most recent first
  sessions.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime())

  return sessions
}

export const loadSessions = (): Session[] => {
  const entries = parseHistoryFile()
  return groupIntoSessions(entries)
}

export const formatRelativeTime = (date: Date): string => {
  const now = Date.now()
  const diff = now - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}
