/**
 * Prefetch Hook
 * Prefetch data on link hover for instant navigation
 */

import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { taskKeys } from './use-tasks'
import { reviewKeys } from './use-reviews'

/**
 * Prefetch task data on hover
 * Skips temp tasks that haven't been saved to the server yet
 */
export function usePrefetchTask() {
  const queryClient = useQueryClient()

  return (taskId: string) => {
    // Don't prefetch temp tasks - they don't exist on the server yet
    if (!taskId || taskId.startsWith('temp-')) return
    
    queryClient.prefetchQuery({
      queryKey: taskKeys.detail(taskId),
      queryFn: () => api.tasks.get(taskId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }
}

/**
 * Prefetch review task data on hover
 */
export function usePrefetchReviewTask() {
  const queryClient = useQueryClient()

  return (taskId: string) => {
    queryClient.prefetchQuery({
      queryKey: reviewKeys.detail(taskId),
      queryFn: () => api.reviewer.getTask(taskId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }
}

/**
 * Prefetch tasks list on hover
 */
export function usePrefetchTasks() {
  const queryClient = useQueryClient()

  return (limit?: number) => {
    queryClient.prefetchQuery({
      queryKey: taskKeys.list({ limit }),
      queryFn: () => api.tasks.list({ limit }),
      staleTime: 3 * 60 * 1000, // 3 minutes
    })
  }
}
