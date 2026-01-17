/**
 * Task Hooks
 * React Query hooks for task operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { CreateTaskDto, UpdateTaskDto, Task } from '@repo/types'

// ==================== Query Keys ====================

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

// ==================== Queries ====================

/**
 * Get all tasks for current user
 */
export function useTasks(options?: { limit?: number }) {
  return useQuery({
    queryKey: taskKeys.list(options),
    queryFn: () => api.tasks.list(options),
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

/**
 * Get a specific task
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => api.tasks.get(id),
    enabled: !!id,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

// ==================== Mutations ====================

/**
 * Create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTaskDto) => api.tasks.create(data),
    onSuccess: (newTask) => {
      // Invalidate task list
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      // Optimistically add to cache
      queryClient.setQueryData<Task[]>(taskKeys.lists(), (old = []) => [newTask, ...old])
    },
  })
}

/**
 * Update a task
 */
export function useUpdateTask(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateTaskDto) => api.tasks.update(id, data),
    onSuccess: (updatedTask) => {
      // Update task in cache
      queryClient.setQueryData(taskKeys.detail(id), (old: any) => ({
        ...old,
        task: updatedTask,
      }))
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

/**
 * Submit a task for review
 */
export function useSubmitTask(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.tasks.submit(id),
    onSuccess: () => {
      // Invalidate all task queries
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}
