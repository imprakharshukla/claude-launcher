import { useState, useEffect, useMemo } from 'react'
import uFuzzy from '@leeoniya/ufuzzy'
import { useDebounce } from './useDebounce.js'
import type { Session } from '../types.js'
import { log } from '../lib/logger.js'
import type { Bookmark } from '../lib/bookmarks.js'

interface UseSearchResult {
  query: string
  setQuery: (query: string) => void
  results: Session[]
}

export const useSearch = (sessions: Session[], bookmarks: Bookmark[] = []): UseSearchResult => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 200)
  const [results, setResults] = useState<Session[]>(sessions)

  const uf = useMemo(() => new uFuzzy({}), [])

  // Create a set of bookmarked session IDs for quick lookup
  const bookmarkedIds = useMemo(() => new Set(bookmarks.map(b => b.sessionId)), [bookmarks])
  const bookmarkNames = useMemo(() => {
    const map = new Map<string, string>()
    bookmarks.forEach(b => map.set(b.sessionId, b.name))
    return map
  }, [bookmarks])

  // Build haystack from messages (limited to prevent hanging)
  // Include bookmark names in haystack for searching
  const haystack = useMemo(() => {
    return sessions.map(s => {
      // Limit to last 20 messages and 2000 chars total to prevent uFuzzy hanging
      const recentMessages = s.messages.slice(-20)
      const allMessages = recentMessages.map(m => m.display).join(' ')
      const truncated = allMessages.length > 2000 ? allMessages.slice(0, 2000) : allMessages
      // Include bookmark name if exists
      const bookmarkName = bookmarkNames.get(s.id) || ''
      return `${bookmarkName} ${truncated} ${s.projectName}`
    })
  }, [sessions, bookmarkNames])

  useEffect(() => {
    log('Search effect triggered', { debouncedQuery, sessionCount: sessions.length })

    if (!debouncedQuery.trim()) {
      log('Empty query, showing all sessions')
      // Sort with bookmarks first, then by date
      const sorted = [...sessions].sort((a, b) => {
        const aBookmarked = bookmarkedIds.has(a.id)
        const bBookmarked = bookmarkedIds.has(b.id)
        if (aBookmarked && !bBookmarked) return -1
        if (!aBookmarked && bBookmarked) return 1
        return b.lastActive.getTime() - a.lastActive.getTime()
      })
      setResults(sorted)
      return
    }

    try {
      log('Running uFuzzy.filter', { haystackLength: haystack.length })
      const idxs = uf.filter(haystack, debouncedQuery)
      log('uFuzzy.filter complete', { matchCount: idxs?.length ?? 0 })

      if (!idxs || idxs.length === 0) {
        log('No matches found')
        setResults([])
        return
      }

      // Get matching sessions and sort: bookmarks first, then by date
      const matched = idxs.map(i => sessions[i]).filter(Boolean)
      const sorted = matched.sort((a, b) => {
        const aBookmarked = bookmarkedIds.has(a.id)
        const bBookmarked = bookmarkedIds.has(b.id)
        if (aBookmarked && !bBookmarked) return -1
        if (!aBookmarked && bBookmarked) return 1
        return b.lastActive.getTime() - a.lastActive.getTime()
      })
      log('Setting sorted results', { count: sorted.length })
      setResults(sorted)
    } catch (e) {
      // If search fails, show all sessions
      log('Search error', { error: String(e) })
      setResults(sessions)
    }
  }, [debouncedQuery, sessions, haystack, uf, bookmarkedIds])

  return { query, setQuery, results }
}
