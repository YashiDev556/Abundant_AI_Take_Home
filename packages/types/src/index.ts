/**
 * Shared Types Package
 * Comprehensive type definitions used across frontend and backend
 */

// Import enums for use in type guards
import { TaskState, ReviewDecision, Difficulty, UserRole } from './enums'

// Re-export enums first (needed by constants)
export * from './enums'

// Re-export constants and utilities
export * from './constants'
export * from './utils'

// ==================== Domain Models ====================

export interface User {
  id: string
  clerkId: string
  email: string
  name: string | null
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface UserSummary {
  id: string
  name: string | null
  email: string
}

export interface Task {
  id: string
  title: string
  instruction: string
  difficulty: Difficulty
  categories: string
  maxAgentTimeoutSec: number
  maxTestTimeoutSec: number
  taskYaml: string | null
  dockerComposeYaml: string | null
  solutionSh: string | null
  runTestsSh: string | null
  testsJson: string | null
  state: TaskState
  authorId: string
  reviewerId: string | null
  createdAt: Date
  updatedAt: Date
  author?: UserSummary
  reviewer?: UserSummary
  reviews?: Review[]
}

export interface Review {
  id: string
  taskId: string
  reviewerId: string
  decision: ReviewDecision
  comment: string | null
  createdAt: Date
  reviewer?: UserSummary
}

// ==================== API Request DTOs ====================

export interface CreateTaskDto {
  title: string
  instruction: string
  difficulty: Difficulty
  categories: string
  maxAgentTimeoutSec: number
  maxTestTimeoutSec: number
  taskYaml?: string
  dockerComposeYaml?: string
  solutionSh?: string
  runTestsSh?: string
  testsJson?: string
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {}

export interface SubmitReviewDto {
  decision: ReviewDecision
  comment?: string
}

// ==================== API Response Types ====================

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface TaskResponse {
  task: Task
  message?: string
}

export interface TasksResponse {
  tasks: Task[]
}

export interface ReviewResponse {
  task: Task
  review: Review
  message?: string
}

export interface UserResponse {
  user: User
}

// ==================== Error Types ====================

export interface ValidationError {
  field: string
  message: string
}

export interface ApiError {
  error: string
  details?: ValidationError[]
  statusCode?: number
}

// ==================== Query/Filter Types ====================

export interface TaskFilters {
  state?: TaskState | 'all'
  difficulty?: Difficulty | 'all'
  searchQuery?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

// ==================== Type Guards ====================

export function isTaskState(value: unknown): value is TaskState {
  return typeof value === 'string' && Object.values(TaskState).includes(value as TaskState)
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && Object.values(Difficulty).includes(value as Difficulty)
}

export function isReviewDecision(value: unknown): value is ReviewDecision {
  return typeof value === 'string' && Object.values(ReviewDecision).includes(value as ReviewDecision)
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && Object.values(UserRole).includes(value as UserRole)
}
