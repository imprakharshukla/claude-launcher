import React from 'react'
import { render } from 'ink'
import { App } from './App.js'

// Check if stdin is a TTY
const stdin = process.stdin

if (!stdin.isTTY) {
  console.error('Error: This command must be run in an interactive terminal.')
  console.error('Run it directly in your terminal, not piped or in a script.')
  process.exit(1)
}

render(<App />)
