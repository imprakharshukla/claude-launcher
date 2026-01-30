import React from 'react'
import { Box, Text } from 'ink'
import { formatRelativeTime } from '../lib/claude.js'
import type { Session } from '../types.js'
import type { Bookmark } from '../lib/bookmarks.js'

interface Props {
  session: Session
  isSelected: boolean
  hasActiveTmux: boolean
  bookmark?: Bookmark
}

// Clean and truncate a message
const cleanMessage = (msg: string, maxLen: number): string => {
  const cleaned = msg.replace(/\s+/g, ' ').trim()
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '...' : cleaned
}

export const SessionItem: React.FC<Props> = ({ session, isSelected, hasActiveTmux, bookmark }) => {
  const time = formatRelativeTime(session.lastActive)

  // Use bookmark name if exists, otherwise first message
  const title = bookmark
    ? bookmark.name
    : cleanMessage(session.messages[0]?.display || session.lastMessage, 80)

  // Get last 3 messages (excluding the first if it's the same)
  const recentMessages = session.messages
    .slice(-3)
    .map(m => cleanMessage(m.display, 60))

  return (
    <Box flexDirection="column" marginBottom={isSelected ? 1 : 0}>
      {/* Main row: indicator, selector, title, project, time */}
      <Box>
        <Text color="yellow">{bookmark ? '★' : ' '}</Text>
        <Text color="green">{hasActiveTmux ? '●' : ' '}</Text>
        <Text color={isSelected ? 'yellow' : undefined}>
          {isSelected ? '❯' : ' '}
        </Text>
        <Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
          {title}
        </Text>
        <Text> </Text>
        <Text color="cyan" dimColor={!isSelected}>
          {session.projectName}
        </Text>
        <Text> </Text>
        <Text color="gray" dimColor>
          {time}
        </Text>
      </Box>

      {/* Show recent messages only when selected */}
      {isSelected && recentMessages.length > 0 && (
        <Box flexDirection="column" marginLeft={3}>
          <Text color="gray" dimColor>Recent:</Text>
          {recentMessages.map((msg, i) => (
            <Box key={i} marginLeft={1}>
              <Text color="gray" dimColor>• {msg}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
