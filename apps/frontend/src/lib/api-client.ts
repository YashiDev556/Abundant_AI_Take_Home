/**
 * Type-Safe API Client
 * Centralized API communication with full type safety
 */

import {
  Task,
  Review,
  User,
  CreateTaskDto,
  UpdateTaskDto,
  SubmitReviewDto,
  ReviewDecision,
  TasksResponse,
  TaskResponse,
  ReviewResponse,
  UserResponse,
} from '@repo/types'

const API_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000'

// ==================== Core API Client ====================

/**
 * Base API client with authentication and error handling
 */
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Get authentication token from Next.js API route
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/auth/token', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        return data.token || null
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error)
    }
    return null
  }

  /**
   * Make an authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Merge existing headers
    if (options.headers) {
      Object.assign(headers, options.headers)
    }

    // Add Authorization header if we have a token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for Clerk session (fallback)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// ==================== Service Classes ====================

/**
 * Auth API Service
 */
class AuthService {
  constructor(private client: ApiClient) {}

  async getMe(): Promise<User> {
    const response = await this.client.get<UserResponse>('/api/auth/me')
    return response.user
  }
}

/**
 * Tasks API Service
 */
class TasksService {
  constructor(private client: ApiClient) {}

  async list(options?: { limit?: number }): Promise<Task[]> {
    const queryParams = options?.limit ? `?limit=${options.limit}` : ''
    const response = await this.client.get<TasksResponse>(`/api/tasks${queryParams}`)
    return response.tasks
  }

  async get(id: string): Promise<Task> {
    const response = await this.client.get<TaskResponse>(`/api/tasks/${id}`)
    return response.task
  }

  async create(data: CreateTaskDto): Promise<Task> {
    const response = await this.client.post<TaskResponse>('/api/tasks', data)
    return response.task
  }

  async update(id: string, data: UpdateTaskDto): Promise<Task> {
    const response = await this.client.put<TaskResponse>(`/api/tasks/${id}`, data)
    return response.task
  }

  async submit(id: string): Promise<Task> {
    const response = await this.client.post<TaskResponse>(`/api/tasks/${id}/submit`)
    return response.task
  }
}

/**
 * Reviewer API Service
 */
class ReviewerService {
  constructor(private client: ApiClient) {}

  async listTasks(options?: { limit?: number }): Promise<Task[]> {
    const queryParams = options?.limit ? `?limit=${options.limit}` : ''
    const response = await this.client.get<TasksResponse>(`/api/reviewer/tasks${queryParams}`)
    return response.tasks
  }

  async getTask(id: string): Promise<Task> {
    const response = await this.client.get<TaskResponse>(`/api/reviewer/tasks/${id}`)
    return response.task
  }

  async startReview(id: string): Promise<Task> {
    const response = await this.client.post<TaskResponse>(`/api/reviewer/tasks/${id}/start`)
    return response.task
  }

  async submitReview(id: string, decision: ReviewDecision, comment?: string): Promise<{ task: Task; review: Review }> {
    const data: SubmitReviewDto = { decision, comment }
    const response = await this.client.post<ReviewResponse>(`/api/reviewer/tasks/${id}/review`, data)
    return { task: response.task, review: response.review }
  }
}

// ==================== Audit Service ====================

interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  userId: string
  userName?: string | null
  userEmail?: string | null
  metadata?: any
  createdAt: string
}

interface DiffChange {
  field: string
  oldValue: any
  newValue: any
  type: 'added' | 'removed' | 'modified'
}

interface TaskDiff {
  fromVersion: number
  toVersion: number
  fromState: string
  toState: string
  changes: DiffChange[]
  changedBy: string
  changedAt: string
}

class AuditService {
  constructor(private client: ApiClient) {}

  async getEntityLogs(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    const response = await this.client.get<{ logs: AuditLogEntry[] }>(
      `/api/audit/entity/${entityType}/${entityId}`
    )
    return response.logs
  }

  async getTaskHistory(taskId: string): Promise<any[]> {
    const response = await this.client.get<{ history: any[] }>(`/api/audit/task/${taskId}/history`)
    return response.history
  }

  async getTaskDiff(taskId: string, fromVersion: number, toVersion: number): Promise<TaskDiff> {
    const response = await this.client.get<{ diff: TaskDiff }>(
      `/api/audit/task/${taskId}/diff?fromVersion=${fromVersion}&toVersion=${toVersion}`
    )
    return response.diff
  }

  async getLatestTaskDiff(taskId: string): Promise<TaskDiff | null> {
    const response = await this.client.get<{ diff: TaskDiff | null }>(
      `/api/audit/task/${taskId}/latest-diff`
    )
    return response.diff
  }
}

// ==================== Exports ====================

const apiClient = new ApiClient(API_URL)

export const api = {
  auth: new AuthService(apiClient),
  tasks: new TasksService(apiClient),
  reviewer: new ReviewerService(apiClient),
  audit: new AuditService(apiClient),
}

// Legacy exports for backward compatibility (will be removed)
export const authApi = {
  getMe: () => api.auth.getMe(),
}

export const tasksApi = {
  list: (options?: { limit?: number }) => api.tasks.list(options),
  get: (id: string) => api.tasks.get(id),
  create: (data: CreateTaskDto) => api.tasks.create(data),
  update: (id: string, data: UpdateTaskDto) => api.tasks.update(id, data),
  submit: (id: string) => api.tasks.submit(id),
}

export const reviewerApi = {
  listTasks: (options?: { limit?: number }) => api.reviewer.listTasks(options),
  getTask: (id: string) => api.reviewer.getTask(id),
  startReview: (id: string) => api.reviewer.startReview(id),
  submitReview: (id: string, decision: ReviewDecision, comment?: string) =>
    api.reviewer.submitReview(id, decision, comment),
}

export const auditApi = {
  getEntityLogs: (entityType: string, entityId: string) => api.audit.getEntityLogs(entityType, entityId),
  getTaskHistory: (taskId: string) => api.audit.getTaskHistory(taskId),
  getTaskDiff: (taskId: string, fromVersion: number, toVersion: number) =>
    api.audit.getTaskDiff(taskId, fromVersion, toVersion),
  getLatestTaskDiff: (taskId: string) => api.audit.getLatestTaskDiff(taskId),
}

// Export types for use in components
export type { AuditLogEntry, DiffChange, TaskDiff }
