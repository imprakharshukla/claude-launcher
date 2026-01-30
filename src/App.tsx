import React, { useState, useMemo, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { SessionList } from './components/SessionList.js'
import { StatusBar } from './components/StatusBar.js'
import { useHistory } from './hooks/useHistory.js'
import { useSearch } from './hooks/useSearch.js'
import { useActiveSessions } from './hooks/useActiveSessions.js'
import { launchResume, launchResumeDirectGhostty, launchWithContext, detectTerminal } from './lib/terminal.js'
import { tmuxExists } from './lib/tmux.js'
import { extractContext } from './lib/fork.js'
import { log } from './lib/logger.js'
import { addBookmark, removeBookmark, loadBookmarks, type Bookmark } from './lib/bookmarks.js'

export const App: React.FC = () => {
  const { exit } = useApp()
  const { sessions, loading, error } = useHistory()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [launchError, setLaunchError] = useState<string | null>(null)

  // Bookmark state
  const [bookmarkMode, setBookmarkMode] = useState(false)
  const [bookmarkName, setBookmarkName] = useState('')
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  // Load bookmarks on mount
  useEffect(() => {
    setBookmarks(loadBookmarks())
  }, [])

  // Search with bookmarks for prioritization
  const { query, setQuery, results } = useSearch(sessions, bookmarks)
  const activeTmuxSessions = useActiveSessions()

  // Cache terminal detection
  const terminal = useMemo(() => detectTerminal(), [])
  const hasTmux = useMemo(() => tmuxExists(), [])

  // Ensure selectedIndex is always within bounds
  const safeSelectedIndex = useMemo(() => {
    if (results.length === 0) return 0
    return Math.min(selectedIndex, results.length - 1)
  }, [selectedIndex, results.length])

  // Get the currently selected session safely
  const selectedSession = results[safeSelectedIndex]

  // Check if selected session is bookmarked
  const selectedBookmark = useMemo(() => {
    if (!selectedSession) return undefined
    return bookmarks.find(b => b.sessionId === selectedSession.id)
  }, [selectedSession, bookmarks])

  // Log on mount
  useEffect(() => {
    log('App mounted', { terminal: terminal?.name, hasTmux, sessionCount: sessions.length })
  }, [])

  // Log results changes
  useEffect(() => {
    log('Results changed', { count: results.length, query })
  }, [results.length, query])

  useInput((input, key) => {
    log('Input received', { input, key: JSON.stringify(key), bookmarkMode })

    // Handle bookmark mode separately
    if (bookmarkMode) {
      if (key.escape) {
        setBookmarkMode(false)
        setBookmarkName('')
        return
      }
      if (key.return && selectedSession && bookmarkName.trim()) {
        addBookmark({
          name: bookmarkName.trim(),
          sessionId: selectedSession.id,
          project: selectedSession.project,
          projectName: selectedSession.projectName
        })
        setBookmarks(loadBookmarks())
        setBookmarkMode(false)
        setBookmarkName('')
        log('Bookmark saved', { name: bookmarkName, sessionId: selectedSession.id })
        return
      }
      // Don't process other keys in bookmark mode
      return
    }

    // Arrow keys for navigation
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1))
    }
    if (key.downArrow) {
      setSelectedIndex(i => Math.min(results.length - 1, Math.max(0, i + 1)))
    }

    // Enter to resume
    if (key.return && selectedSession) {
      try {
        launchResume(selectedSession.id, selectedSession.project)
        exit()
      } catch (e) {
        setLaunchError(e instanceof Error ? e.message : String(e))
      }
    }

    // Ctrl+F to fork
    if (key.ctrl && input === 'f' && selectedSession) {
      try {
        const context = extractContext(selectedSession)
        launchWithContext(selectedSession.project, context)
        exit()
      } catch (e) {
        setLaunchError(e instanceof Error ? e.message : String(e))
      }
    }

    // 'g' to open directly in Ghostty (no tmux)
    if (input === 'g' && selectedSession && !key.ctrl && !key.meta) {
      try {
        log('Opening in Ghostty directly', { sessionId: selectedSession.id })
        launchResumeDirectGhostty(selectedSession.id, selectedSession.project)
        exit()
      } catch (e) {
        setLaunchError(e instanceof Error ? e.message : String(e))
      }
    }

    // 's' to save/bookmark (or 'S' to remove bookmark)
    if (input === 's' && selectedSession && !key.ctrl && !key.meta) {
      // Enter bookmark mode with default name
      const defaultName = selectedSession.projectName + ': ' +
        selectedSession.lastMessage.replace(/\s+/g, ' ').trim().slice(0, 30)
      setBookmarkName(selectedBookmark?.name || defaultName)
      setBookmarkMode(true)
      return
    }

    // 'x' to remove bookmark
    if (input === 'x' && selectedSession && selectedBookmark && !key.ctrl && !key.meta) {
      removeBookmark(selectedSession.id)
      setBookmarks(loadBookmarks())
      log('Bookmark removed', { sessionId: selectedSession.id })
      return
    }

    // Clear error on Escape only (not every key)
    if (launchError && key.escape) {
      setLaunchError(null)
      return // Don't also clear search
    }

    // Escape: clear search or quit
    if (key.escape) {
      if (query) {
        setQuery('')
        setSelectedIndex(0)
      } else {
        exit()
      }
    }

    // Ctrl+Q or Ctrl+C to quit
    if (key.ctrl && (input === 'q' || input === 'c')) {
      exit()
    }
  })

  // Reset selection when results change significantly
  React.useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(0, results.length - 1))
    }
  }, [results.length, selectedIndex])

  // Error state: no terminal
  if (!terminal) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Error: No supported terminal found</Text>
        <Text color="gray">Install one of: ghostty, wezterm, kitty, alacritty</Text>
        <Box marginTop={1}>
          <Text color="gray">Press any key to exit</Text>
        </Box>
      </Box>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">Loading sessions...</Text>
      </Box>
    )
  }

  // Error state: no history
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <Text color="gray">Press any key to exit</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Claude Sessions</Text>
        <Text color="gray"> ({terminal.name}</Text>
        {hasTmux && <Text color="green"> + tmux</Text>}
        <Text color="gray">)</Text>
      </Box>

      <Box>
        {bookmarkMode ? (
          <>
            <Text color="yellow">Bookmark name: </Text>
            <TextInput
              value={bookmarkName}
              onChange={setBookmarkName}
              placeholder="enter name..."
            />
          </>
        ) : (
          <>
            <Text>Search: </Text>
            <TextInput
              value={query}
              onChange={(value) => {
                log('TextInput onChange', { value, prevQuery: query })
                setQuery(value)
                setSelectedIndex(0)
              }}
              placeholder="type to filter..."
            />
          </>
        )}
      </Box>

      <SessionList
        sessions={results}
        selectedIndex={safeSelectedIndex}
        activeTmuxSessions={activeTmuxSessions}
        bookmarks={bookmarks}
      />

      {launchError && (
        <Box marginTop={1}>
          <Text color="red">Error: {launchError}</Text>
        </Box>
      )}

      <StatusBar
        totalSessions={sessions.length}
        filteredCount={results.length}
        hasQuery={query.length > 0}
      />
    </Box>
  )
}
