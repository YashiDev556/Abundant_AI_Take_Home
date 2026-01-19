/**
 * Review Hooks
 * React Query hooks for reviewer operations
 * OPTIMIZED: Ultra aggressive caching for fast page loads
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { updateAllTaskLists, taskKeys } from '@/hooks/use-tasks'
import type { ReviewDecision, Task } from '@repo/types'

// ==================== Query Keys ====================

export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...reviewKeys.lists(), filters] as const,
  details: () => [...reviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...reviewKeys.details(), id] as const,
}

// ==================== Queries ====================

/**
 * Get all tasks available for review
 * OPTIMIZED: Ultra aggressive caching, auto-populates detail cache
 */
export function useReviewTasks(options?: { 
  limit?: number
  filter?: 'pending' | 'history' | 'all'
}) {
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: reviewKeys.list(options),
    queryFn: async () => {
      const tasks = await api.reviewer.listTasks(options)
      
      // OPTIMIZATION: Pre-populate individual task cache entries for instant detail loads
      tasks.forEach(task => {
        queryClient.setQueryData(reviewKeys.detail(task.id), task)
      })
      
      return tasks
    },
    // ULTRA aggressive caching - 10 minutes fresh time
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes in memory
    // Never auto-refetch - rely on optimistic updates
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Keep previous data while loading
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Get a specific task for review
 * OPTIMIZED: Instant load if in list cache
 */
export function useReviewTask(id: string) {
  return useQuery({
    queryKey: reviewKeys.detail(id),
    queryFn: () => api.reviewer.getTask(id),
    enabled: !!id,
    // ULTRA aggressive caching - 15 minutes
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  })
}

// ==================== Mutations ====================

/**
 * Start reviewing a task
 * OPTIMIZED: Instant optimistic update
 */
export function useStartReview(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.reviewer.startReview(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: reviewKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: reviewKeys.lists() })
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      const previousTask = queryClient.getQueryData<Task>(reviewKeys.detail(id))
      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: reviewKeys.lists() })

      // Optimistic update
      if (previousTask) {
        const updatedTask = {
          ...previousTask,
            state: 'IN_REVIEW' as any,
            updatedAt: new Date(),
        }
        queryClient.setQueryData<Task>(reviewKeys.detail(id), updatedTask)
        // Also update task detail cache
        queryClient.setQueryData(taskKeys.detail(id), updatedTask)
      }

      // Update review lists
      queryClient.setQueriesData<Task[]>(
        { queryKey: reviewKeys.lists() },
        (old = []) =>
          old.map((task) =>
            task.id === id
              ? { ...task, state: 'IN_REVIEW' as any, updatedAt: new Date() }
              : task
          )
      )

      // Also update task lists (including dashboard) since state changed
      updateAllTaskLists(queryClient, (old = []) =>
        old.map((task) =>
          task.id === id
            ? { ...task, state: 'IN_REVIEW' as any, updatedAt: new Date() }
            : task
        )
      )

      return { previousTask, previousTasks }
    },
    onError: (err, variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(reviewKeys.detail(id), context.previousTask)
      }
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(reviewKeys.detail(id), updatedTask)
      queryClient.setQueryData(taskKeys.detail(id), updatedTask)
      queryClient.setQueriesData<Task[]>(
        { queryKey: reviewKeys.lists() },
        (old = []) => old.map((task) => (task.id === id ? updatedTask : task))
      )
      updateAllTaskLists(queryClient, (old = []) => old.map((task) => (task.id === id ? updatedTask : task)))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() })
      // Invalidate audit logs so Activity sidebar refreshes
      queryClient.invalidateQueries({ queryKey: ['audit', 'task', id] })
    },
  })
}

/**
 * Submit a review
 * OPTIMIZED: Instant optimistic update
 */
export function useSubmitReview(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ decision, comment }: { decision: ReviewDecision; comment?: string }) =>
      api.reviewer.submitReview(id, decision, comment),
    retry: false, // Don't retry - state changes are not idempotent
    onMutate: async ({ decision }) => {
      await queryClient.cancelQueries({ queryKey: reviewKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: reviewKeys.lists() })
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      const previousTask = queryClient.getQueryData<Task>(reviewKeys.detail(id))
      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: reviewKeys.lists() })

      // Map decision to state
      const newState =
        decision === 'APPROVE'
          ? 'APPROVED'
          : decision === 'REJECT'
          ? 'REJECTED'
          : 'CHANGES_REQUESTED'

      // Optimistic update
      if (previousTask) {
        const updatedTask = {
          ...previousTask,
            state: newState as any,
            updatedAt: new Date(),
        }
        queryClient.setQueryData<Task>(reviewKeys.detail(id), updatedTask)
        // Also update task detail cache
        queryClient.setQueryData(taskKeys.detail(id), updatedTask)
        // Also update reviewer page's inline query
        queryClient.setQueryData(['reviewer', 'tasks', id], updatedTask)
      }

      // Update review lists
      queryClient.setQueriesData<Task[]>(
        { queryKey: reviewKeys.lists() },
        (old = []) =>
          old.map((task) =>
            task.id === id
              ? { ...task, state: newState as any, updatedAt: new Date() }
              : task
          )
      )

      // Also update task lists (including dashboard) since state changed
      updateAllTaskLists(queryClient, (old = []) =>
        old.map((task) =>
          task.id === id
            ? { ...task, state: newState as any, updatedAt: new Date() }
            : task
        )
      )

      return { previousTask, previousTasks }
    },
    onError: (err, variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(reviewKeys.detail(id), context.previousTask)
      }
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: ({ task }) => {
      queryClient.setQueryData(reviewKeys.detail(id), task)
      queryClient.setQueryData(taskKeys.detail(id), task)
      queryClient.setQueriesData<Task[]>(
        { queryKey: reviewKeys.lists() },
        (old = []) => old.map((t) => (t.id === id ? task : t))
      )
      updateAllTaskLists(queryClient, (old = []) => old.map((t) => (t.id === id ? task : t)))
      // Also update the reviewer page's inline query
      queryClient.setQueryData(['reviewer', 'tasks', id], task)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() })
      // Also invalidate the reviewer page's inline query
      queryClient.invalidateQueries({ queryKey: ['reviewer', 'tasks', id] })
      queryClient.invalidateQueries({ queryKey: ['reviewer', 'tasks'] })
      // Invalidate audit logs so Activity sidebar refreshes
      queryClient.invalidateQueries({ queryKey: ['audit', 'task', id] })
    },
  })
}
