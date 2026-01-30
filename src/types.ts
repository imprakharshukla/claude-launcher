export interface HistoryEntry {
  display: string
  project: string
  sessionId: string
  timestamp: number
  pastedContents?: Record<string, unknown>
}

export interface Session {
  id: string
  project: string
  projectName: string
  lastMessage: string
  messageCount: number
  lastActive: Date
  messages: HistoryEntry[]
}

export interface TerminalConfig {
  name: string
  execFlag: string | null
}

export interface TmuxSession {
  name: string
  windows: number
  attached: boolean
  created: Date
}
