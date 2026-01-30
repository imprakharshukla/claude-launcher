import type { Session } from '../types.js'

export const extractContext = (session: Session): string => {
  const { messages, projectName } = session

  // Get first message (initial intent)
  const firstMessage = messages[0]?.display || ''

  // Get last 3 messages for recent context
  const recentMessages = messages.slice(-3).map(m => m.display)

  // Build context summary
  const parts: string[] = [
    `Continuing work on ${projectName}.`,
    '',
    'Previous context:',
    `- Initial task: "${truncate(firstMessage, 100)}"`,
  ]

  if (messages.length > 1) {
    parts.push(`- Total messages in session: ${messages.length}`)
    parts.push('')
    parts.push('Recent conversation:')
    for (const msg of recentMessages) {
      parts.push(`- "${truncate(msg, 150)}"`)
    }
  }

  parts.push('')
  parts.push('Continue from where we left off.')

  return parts.join('\n')
}

const truncate = (str: string, maxLen: number): string => {
  // Clean up the string - remove newlines and extra spaces
  const cleaned = str.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLen) return cleaned
  return cleaned.slice(0, maxLen - 3) + '...'
}
