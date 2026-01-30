import React from 'react'
import { Box, Text } from 'ink'

interface Props {
  totalSessions: number
  filteredCount: number
  hasQuery: boolean
}

export const StatusBar: React.FC<Props> = ({ totalSessions, filteredCount, hasQuery }) => {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="gray">─────────────────────────────────────────────────</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color="gray">
          {hasQuery
            ? `${filteredCount} of ${totalSessions} sessions`
            : `${totalSessions} sessions`}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          <Text color="white">⏎</Text> resume
          <Text color="yellow">g</Text> ghostty
          <Text color="yellow">s</Text> save
          <Text color="white">x</Text> unsave
          <Text color="white">^F</Text> fork
          <Text color="white">esc</Text> {hasQuery ? 'clear' : 'quit'}
        </Text>
      </Box>
    </Box>
  )
}
