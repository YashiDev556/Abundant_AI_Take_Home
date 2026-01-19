/**
 * Shared Utilities
 * Business logic and helper functions used across all packages
 */

import {
  TaskState,
  ReviewDecision,
  Difficulty,
  UserRole,
} from './enums'

import {
  VALID_TASK_TRANSITIONS,
  DECISION_TO_STATE,
  EDITABLE_STATES,
  SUBMITTABLE_STATES,
  REVIEWABLE_STATES,
  STATE_LABELS,
  DIFFICULTY_LABELS,
  DECISION_LABELS,
  STATE_BADGE_CLASSES,
  DIFFICULTY_BADGE_CLASSES,
  STATE_COLORS,
} from './constants'

// ==================== State Machine Logic ====================

/**
 * Check if a state transition is valid
 */
export function isValidTaskTransition(
  currentState: TaskState,
  newState: TaskState
): boolean {
  return VALID_TASK_TRANSITIONS[currentState].includes(newState)
}

/**
 * Get the resulting state from a review decision
 */
export function getStateFromDecision(decision: ReviewDecision): TaskState {
  return DECISION_TO_STATE[decision]
}

/**
 * Check if a task can be edited in its current state
 */
export function canEditTask(state: TaskState): boolean {
  return EDITABLE_STATES.includes(state)
}

/**
 * Check if a task can be submitted for review
 */
export function canSubmitTask(state: TaskState): boolean {
  return SUBMITTABLE_STATES.includes(state)
}

/**
 * Check if a task is in a reviewable state
 */
export function isTaskReviewable(state: TaskState): boolean {
  return REVIEWABLE_STATES.includes(state)
}

/**
 * Check if a state is a final state (no further transitions)
 */
export function isFinalState(state: TaskState): boolean {
  return VALID_TASK_TRANSITIONS[state].length === 0
}

// ==================== Display Helpers ====================

/**
 * Get display label for a task state
 */
export function getStateLabel(state: TaskState): string {
  return STATE_LABELS[state]
}

/**
 * Get display label for a difficulty
 */
export function getDifficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_LABELS[difficulty]
}

/**
 * Get display label for a review decision
 */
export function getDecisionLabel(decision: ReviewDecision): string {
  return DECISION_LABELS[decision]
}

/**
 * Get CSS class for state badge
 */
export function getStateBadgeClass(state: TaskState): string {
  return STATE_BADGE_CLASSES[state]
}

/**
 * Get CSS class for difficulty badge
 */
export function getDifficultyBadgeClass(difficulty: Difficulty): string {
  return DIFFICULTY_BADGE_CLASSES[difficulty]
}

/**
 * Get color class for task state
 */
export function getStateColor(state: TaskState): string {
  return STATE_COLORS[state]
}

// ==================== Validation Helpers ====================

/**
 * Validate timeout values
 */
export function isValidTimeout(timeout: number, min: number = 1, max: number = 3600): boolean {
  return Number.isInteger(timeout) && timeout >= min && timeout <= max
}

/**
 * Validate string length
 */
export function isValidLength(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max
}

/**
 * Parse and validate categories string
 */
export function parseCategories(categories: string): string[] {
  return categories
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 0)
}

/**
 * Format categories array to string
 */
export function formatCategories(categories: string[]): string {
  return categories.filter(c => c.trim()).join(', ')
}

// ==================== Permission Helpers ====================

/**
 * Check if user has permission to edit a task
 */
export function canUserEditTask(userId: string, authorId: string, taskState: TaskState): boolean {
  return userId === authorId && canEditTask(taskState)
}

/**
 * Check if user has permission to submit a task
 */
export function canUserSubmitTask(userId: string, authorId: string, taskState: TaskState): boolean {
  return userId === authorId && canSubmitTask(taskState)
}

/**
 * Check if user is a reviewer
 */
export function isReviewerRole(role: UserRole): boolean {
  return role === UserRole.REVIEWER
}

/**
 * Check if user can review a task
 */
export function canUserReviewTask(userRole: UserRole, taskState: TaskState): boolean {
  return isReviewerRole(userRole) && isTaskReviewable(taskState)
}

// ==================== Date Helpers ====================

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return 'N/A'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return 'N/A'
  return dateObj.toLocaleDateString(undefined, options)
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return 'N/A'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return 'N/A'
  return dateObj.toLocaleString(undefined, options)
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return 'N/A'
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return formatDate(dateObj)
}

// ==================== String Helpers ====================

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// ==================== Array Helpers ====================

/**
 * Group items by a key function
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {} as Record<K, T[]>)
}

/**
 * Sort items by a key function
 */
export function sortBy<T>(
  items: T[],
  keyFn: (item: T) => number | string | Date,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const aKey = keyFn(a)
    const bKey = keyFn(b)
    const comparison = aKey < bKey ? -1 : aKey > bKey ? 1 : 0
    return order === 'asc' ? comparison : -comparison
  })
}
