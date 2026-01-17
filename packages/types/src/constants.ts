/**
 * Shared Constants
 * Application-wide constants used across all packages
 */

import { TaskState, ReviewDecision, Difficulty, AuditAction } from './enums'

// ==================== State Machine Constants ====================

/**
 * Valid state transitions for tasks
 */
export const VALID_TASK_TRANSITIONS: Record<TaskState, TaskState[]> = {
  [TaskState.DRAFT]: [TaskState.SUBMITTED],
  [TaskState.SUBMITTED]: [TaskState.IN_REVIEW],
  [TaskState.IN_REVIEW]: [TaskState.APPROVED, TaskState.REJECTED, TaskState.CHANGES_REQUESTED],
  [TaskState.APPROVED]: [], // Final state
  [TaskState.REJECTED]: [TaskState.SUBMITTED], // Can be resubmitted
  [TaskState.CHANGES_REQUESTED]: [TaskState.SUBMITTED], // Can be resubmitted after changes
}

/**
 * Map review decisions to resulting states
 */
export const DECISION_TO_STATE: Record<ReviewDecision, TaskState> = {
  [ReviewDecision.APPROVE]: TaskState.APPROVED,
  [ReviewDecision.REJECT]: TaskState.REJECTED,
  [ReviewDecision.REQUEST_CHANGES]: TaskState.CHANGES_REQUESTED,
}

/**
 * States in which a task can be edited
 */
export const EDITABLE_STATES: TaskState[] = [TaskState.DRAFT, TaskState.CHANGES_REQUESTED]

/**
 * States from which a task can be submitted for review
 */
export const SUBMITTABLE_STATES: TaskState[] = [
  TaskState.DRAFT,
  TaskState.REJECTED,
  TaskState.CHANGES_REQUESTED,
]

/**
 * States in which a task can be reviewed
 */
export const REVIEWABLE_STATES: TaskState[] = [TaskState.SUBMITTED, TaskState.IN_REVIEW]

// ==================== UI Constants ====================

/**
 * State display labels
 */
export const STATE_LABELS: Record<TaskState, string> = {
  [TaskState.DRAFT]: 'Draft',
  [TaskState.SUBMITTED]: 'Submitted',
  [TaskState.IN_REVIEW]: 'In Review',
  [TaskState.APPROVED]: 'Approved',
  [TaskState.REJECTED]: 'Rejected',
  [TaskState.CHANGES_REQUESTED]: 'Changes Requested',
}

/**
 * Difficulty display labels
 */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.EASY]: 'Easy',
  [Difficulty.MEDIUM]: 'Medium',
  [Difficulty.HARD]: 'Hard',
}

/**
 * Review decision labels
 */
export const DECISION_LABELS: Record<ReviewDecision, string> = {
  [ReviewDecision.APPROVE]: 'Approve',
  [ReviewDecision.REJECT]: 'Reject',
  [ReviewDecision.REQUEST_CHANGES]: 'Request Changes',
}

/**
 * Audit action labels
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  [AuditAction.TASK_CREATED]: 'Created Task',
  [AuditAction.TASK_UPDATED]: 'Updated Task',
  [AuditAction.TASK_SUBMITTED]: 'Submitted Task',
  [AuditAction.TASK_APPROVED]: 'Approved Task',
  [AuditAction.TASK_REJECTED]: 'Rejected Task',
  [AuditAction.TASK_CHANGES_REQUESTED]: 'Requested Changes',
  [AuditAction.REVIEW_STARTED]: 'Started Review',
  [AuditAction.REVIEW_SUBMITTED]: 'Submitted Review',
}

/**
 * Task state CSS class mappings
 */
export const STATE_BADGE_CLASSES: Record<TaskState, string> = {
  [TaskState.DRAFT]: 'badge-draft',
  [TaskState.SUBMITTED]: 'badge-submitted',
  [TaskState.IN_REVIEW]: 'badge-in-review',
  [TaskState.APPROVED]: 'badge-approved',
  [TaskState.REJECTED]: 'badge-rejected',
  [TaskState.CHANGES_REQUESTED]: 'badge-changes',
}

/**
 * Difficulty CSS class mappings
 */
export const DIFFICULTY_BADGE_CLASSES: Record<Difficulty, string> = {
  [Difficulty.EASY]: 'badge-easy',
  [Difficulty.MEDIUM]: 'badge-medium',
  [Difficulty.HARD]: 'badge-hard',
}

/**
 * State color mappings
 */
export const STATE_COLORS: Record<TaskState, string> = {
  [TaskState.DRAFT]: 'text-muted-foreground',
  [TaskState.SUBMITTED]: 'text-amber-500',
  [TaskState.IN_REVIEW]: 'text-blue-500',
  [TaskState.APPROVED]: 'text-emerald-500',
  [TaskState.REJECTED]: 'text-red-500',
  [TaskState.CHANGES_REQUESTED]: 'text-orange-500',
}

// ==================== Validation Constants ====================

/**
 * Default timeout values (in seconds)
 */
export const DEFAULT_TIMEOUTS = {
  AGENT: 300,
  TEST: 60,
} as const

/**
 * Minimum timeout values (in seconds)
 */
export const MIN_TIMEOUTS = {
  AGENT: 1,
  TEST: 1,
} as const

/**
 * Maximum timeout values (in seconds)
 */
export const MAX_TIMEOUTS = {
  AGENT: 3600,
  TEST: 600,
} as const

/**
 * Field length limits
 */
export const FIELD_LIMITS = {
  TITLE: { MIN: 1, MAX: 200 },
  INSTRUCTION: { MIN: 1, MAX: 10000 },
  CATEGORIES: { MIN: 1, MAX: 200 },
  COMMENT: { MIN: 0, MAX: 2000 },
} as const

// ==================== Database Constants ====================

/**
 * Prisma include patterns for common queries
 */
export const TASK_INCLUDE_AUTHOR_REVIEWER = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  reviewer: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const

/**
 * Lightweight include for list views - no reviews
 */
export const TASK_INCLUDE_LIGHT = {
  ...TASK_INCLUDE_AUTHOR_REVIEWER,
} as const

/**
 * Full include with reviews - use only for detail views
 */
export const TASK_INCLUDE_FULL = {
  ...TASK_INCLUDE_AUTHOR_REVIEWER,
  reviews: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
} as const

// ==================== HTTP Status Codes ====================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const

// ==================== Error Messages ====================

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  USER_NOT_FOUND: 'User not found',
  TASK_NOT_FOUND: 'Task not found',
  FORBIDDEN: 'Forbidden',
  FORBIDDEN_AUTHOR_ONLY: 'Forbidden: Only the author can perform this action',
  FORBIDDEN_REVIEWER_ONLY: 'Forbidden: Reviewer access required',
  TASK_NOT_EDITABLE: 'Task cannot be edited in current state',
  TASK_NOT_SUBMITTABLE: 'Task cannot be submitted in current state',
  TASK_NOT_REVIEWABLE: 'Task is not in a reviewable state',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_TRANSITION: 'Invalid state transition',
  REQUIRED_FIELDS_MISSING: 'Required fields are missing',
} as const
