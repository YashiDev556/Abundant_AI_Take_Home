/**
 * Review Hooks
 * React Query hooks for review operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { ReviewDecision } from '@repo/types'

// ==================== Query Keys ====================

export const reviewKeys = {
  all: ['reviews'] as const,
  tasks: () => [...reviewKeys.all, 'tasks'] as const,
  task: (id: string) => [...reviewKeys.all, 'task', id] as const,
}

// ==================== Queries ====================

/**
 * Get all tasks for review
 */
export function useReviewTasks(options?: { limit?: number }) {
  return useQuery({
    queryKey: [...reviewKeys.tasks(), options],
    queryFn: () => api.reviewer.listTasks(options),
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

/**
 * Get a specific task for review
 */
export function useReviewTask(id: string) {
  return useQuery({
    queryKey: reviewKeys.task(id),
    queryFn: () => api.reviewer.getTask(id),
    enabled: !!id,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

// ==================== Mutations ====================

/**
 * Start reviewing a task
 */
export function useStartReview(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.reviewer.startReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.task(id) })
      queryClient.invalidateQueries({ queryKey: reviewKeys.tasks() })
    },
  })
}

/**
 * Submit a review
 */
export function useSubmitReview(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ decision, comment }: { decision: ReviewDecision; comment?: string }) =>
      api.reviewer.submitReview(id, decision, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.task(id) })
      queryClient.invalidateQueries({ queryKey: reviewKeys.tasks() })
    },
  })
}
