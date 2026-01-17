/**
 * UI Utilities
 * Shared UI helper functions for badges, icons, formatting, etc.
 */

import {
  TaskState,
  Difficulty,
  ReviewDecision,
  getStateBadgeClass as getStateBadgeClassFromTypes,
  getDifficultyBadgeClass as getDifficultyBadgeClassFromTypes,
  getStateColor as getStateColorFromTypes,
  getStateLabel,
  getDifficultyLabel,
  getDecisionLabel,
  formatDate,
  formatDateTime,
  getRelativeTime,
  truncateText,
} from '@repo/types'

import {
  Clock,
  Timer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit3,
  type LucideIcon,
} from 'lucide-react'

// Re-export formatting utilities
export {
  formatDate,
  formatDateTime,
  getRelativeTime,
  truncateText,
  getStateLabel,
  getDifficultyLabel,
  getDecisionLabel,
}

// ==================== Badge Classes ====================

/**
 * Get CSS class for task state badge
 */
export function getStateBadgeClass(state: TaskState | string): string {
  return getStateBadgeClassFromTypes(state as TaskState)
}

/**
 * Get CSS class for difficulty badge
 */
export function getDifficultyBadgeClass(difficulty: Difficulty | string): string {
  return getDifficultyBadgeClassFromTypes(difficulty as Difficulty)
}

/**
 * Get CSS class for review decision badge
 */
export function getDecisionBadgeClass(decision: ReviewDecision | string): string {
  const classes: Record<ReviewDecision, string> = {
    [ReviewDecision.APPROVE]: 'badge-approved',
    [ReviewDecision.REJECT]: 'badge-rejected',
    [ReviewDecision.REQUEST_CHANGES]: 'badge-changes',
  }
  return classes[decision as ReviewDecision] || 'badge-draft'
}

// ==================== Icon Mappings ====================

/**
 * Get icon component for task state
 */
export function getStateIcon(state: TaskState | string): LucideIcon {
  const icons: Record<TaskState, LucideIcon> = {
    [TaskState.DRAFT]: Edit3,
    [TaskState.SUBMITTED]: Clock,
    [TaskState.IN_REVIEW]: Timer,
    [TaskState.APPROVED]: CheckCircle2,
    [TaskState.REJECTED]: XCircle,
    [TaskState.CHANGES_REQUESTED]: AlertCircle,
  }
  return icons[state as TaskState] || Clock
}

/**
 * Get icon component for review decision
 */
export function getDecisionIcon(decision: ReviewDecision | string): LucideIcon {
  const icons: Record<ReviewDecision, LucideIcon> = {
    [ReviewDecision.APPROVE]: CheckCircle2,
    [ReviewDecision.REJECT]: XCircle,
    [ReviewDecision.REQUEST_CHANGES]: AlertCircle,
  }
  return icons[decision as ReviewDecision] || AlertCircle
}

// ==================== Color Helpers ====================

/**
 * Get color class for task state
 */
export function getStateColor(state: TaskState | string): string {
  return getStateColorFromTypes(state as TaskState)
}

/**
 * Get color class for review decision
 */
export function getDecisionColor(decision: ReviewDecision | string): string {
  const colors: Record<ReviewDecision, string> = {
    [ReviewDecision.APPROVE]: 'text-emerald-500',
    [ReviewDecision.REJECT]: 'text-red-500',
    [ReviewDecision.REQUEST_CHANGES]: 'text-amber-500',
  }
  return colors[decision as ReviewDecision] || 'text-muted-foreground'
}

/**
 * Get background color class for review decision
 */
export function getDecisionBgColor(decision: ReviewDecision | string): string {
  const colors: Record<ReviewDecision, string> = {
    [ReviewDecision.APPROVE]: 'bg-emerald-500/10',
    [ReviewDecision.REJECT]: 'bg-red-500/10',
    [ReviewDecision.REQUEST_CHANGES]: 'bg-amber-500/10',
  }
  return colors[decision as ReviewDecision] || 'bg-secondary/50'
}

// ==================== Display Helpers ====================

/**
 * Format categories for display
 */
export function formatCategories(categories: string): string {
  return categories
    .split(',')
    .map(c => c.trim())
    .filter(c => c)
    .join(', ')
}

/**
 * Format timeout for display
 */
export function formatTimeout(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) {
    return `${minutes}m`
  }
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Get plural form of a word
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular
  return plural || `${singular}s`
}

/**
 * Format count with label
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`
}
