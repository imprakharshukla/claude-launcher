import { useState, useEffect } from 'react'
import { listSessions, tmuxExists } from '../lib/tmux.js'
import type { TmuxSession } from '../types.js'

export const useActiveSessions = (): Map<string, TmuxSession> => {
  const [sessions, setSessions] = useState<Map<string, TmuxSession>>(new Map())

  useEffect(() => {
    if (!tmuxExists()) return

    const check = () => {
      const tmuxSessions = listSessions()
      const map = new Map<string, TmuxSession>()
      for (const s of tmuxSessions) {
        map.set(s.name, s)
      }
      setSessions(map)
    }

    check()
    const interval = setInterval(check, 3000) // Poll every 3s
    return () => clearInterval(interval)
  }, [])

  return sessions
}
