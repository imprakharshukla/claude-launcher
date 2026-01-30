import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { log } from './logger.js'

const BOOKMARKS_DIR = join(homedir(), '.claude-launcher')
const BOOKMARKS_FILE = join(BOOKMARKS_DIR, 'bookmarks.json')

export interface Bookmark {
  name: string
  sessionId: string
  project: string
  projectName: string
  createdAt: string
}

// Ensure directory exists
const ensureDir = () => {
  if (!existsSync(BOOKMARKS_DIR)) {
    mkdirSync(BOOKMARKS_DIR, { recursive: true })
  }
}

// Load bookmarks from file
export const loadBookmarks = (): Bookmark[] => {
  try {
    ensureDir()
    if (!existsSync(BOOKMARKS_FILE)) {
      return []
    }
    const data = readFileSync(BOOKMARKS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    log('Error loading bookmarks', { error: String(e) })
    return []
  }
}

// Save bookmarks to file
export const saveBookmarks = (bookmarks: Bookmark[]): void => {
  try {
    ensureDir()
    writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2))
  } catch (e) {
    log('Error saving bookmarks', { error: String(e) })
  }
}

// Add a bookmark
export const addBookmark = (bookmark: Omit<Bookmark, 'createdAt'>): void => {
  const bookmarks = loadBookmarks()

  // Check if already bookmarked
  const existing = bookmarks.find(b => b.sessionId === bookmark.sessionId)
  if (existing) {
    // Update the name
    existing.name = bookmark.name
    saveBookmarks(bookmarks)
    return
  }

  bookmarks.unshift({
    ...bookmark,
    createdAt: new Date().toISOString()
  })
  saveBookmarks(bookmarks)
}

// Remove a bookmark
export const removeBookmark = (sessionId: string): void => {
  const bookmarks = loadBookmarks()
  const filtered = bookmarks.filter(b => b.sessionId !== sessionId)
  saveBookmarks(filtered)
}

// Check if session is bookmarked
export const isBookmarked = (sessionId: string): boolean => {
  const bookmarks = loadBookmarks()
  return bookmarks.some(b => b.sessionId === sessionId)
}

// Get bookmark for session
export const getBookmark = (sessionId: string): Bookmark | undefined => {
  const bookmarks = loadBookmarks()
  return bookmarks.find(b => b.sessionId === sessionId)
}
