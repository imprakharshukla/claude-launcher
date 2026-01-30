import { useState, useEffect, useCallback } from 'react'
import chokidar from 'chokidar'
import { loadSessions, HISTORY_PATH, claudeExists } from '../lib/claude.js'
import type { Session } from '../types.js'

interface UseHistoryResult {
  sessions: Session[]
  loading: boolean
  error: string | null
  reload: () => void
}

export const useHistory = (): UseHistoryResult => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    try {
      if (!claudeExists()) {
        setError('No Claude history found. Run Claude Code first.')
        setSessions([])
        return
      }
      const loaded = loadSessions()
      setSessions(loaded)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load
    reload()

    // Watch for changes
    const watcher = chokidar.watch(HISTORY_PATH, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    })

    let debounceTimer: NodeJS.Timeout | null = null

    const debouncedReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(reload, 500)
    }

    watcher.on('change', debouncedReload)
    watcher.on('error', (err) => {
      console.error('Watcher error:', err)
    })

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      watcher.close()
    }
  }, [reload])

  return { sessions, loading, error, reload }
}
