import React from 'react'
import { Box, Text } from 'ink'
import { SessionItem } from './SessionItem.js'
import type { Session, TmuxSession } from '../types.js'
import { getSessionName } from '../lib/tmux.js'
import type { Bookmark } from '../lib/bookmarks.js'

interface Props {
  sessions: Session[]
  selectedIndex: number
  activeTmuxSessions: Map<string, TmuxSession>
  bookmarks: Bookmark[]
}

const PAGE_SIZE = 8  // Reduced since selected item shows more content

export const SessionList: React.FC<Props> = ({ sessions, selectedIndex, activeTmuxSessions, bookmarks }) => {
  if (sessions.length === 0) {
    return (
      <Box paddingY={1}>
        <Text color="gray">No sessions found</Text>
      </Box>
    )
  }

  // Calculate visible window
  const startIdx = Math.max(0, Math.min(selectedIndex - Math.floor(PAGE_SIZE / 2), sessions.length - PAGE_SIZE))
  const endIdx = Math.min(startIdx + PAGE_SIZE, sessions.length)
  const visibleSessions = sessions.slice(startIdx, endIdx)

  return (
    <Box flexDirection="column" paddingY={1}>
      {visibleSessions.map((session, idx) => {
        const actualIdx = startIdx + idx
        // Check if this project has an active tmux session
        const tmuxSessionName = getSessionName(session.project)
        const hasActiveTmux = activeTmuxSessions.has(tmuxSessionName)
        // Check if bookmarked
        const bookmark = bookmarks.find(b => b.sessionId === session.id)

        return (
          <SessionItem
            key={session.id}
            session={session}
            isSelected={actualIdx === selectedIndex}
            hasActiveTmux={hasActiveTmux}
            bookmark={bookmark}
          />
        )
      })}
    </Box>
  )
}
