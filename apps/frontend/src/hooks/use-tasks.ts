/**
 * Task Hooks
 * React Query hooks for task operations
 */

import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { TaskState } from '@repo/types'
import type { CreateTaskDto, UpdateTaskDto, Task } from '@repo/types'

// ==================== Query Keys ====================

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  dashboard: () => [...taskKeys.all, 'dashboard'] as const,
}

/**
 * Helper to update all task list queries (both list and dashboard)
 * Exported so review mutations can also update task lists
 */
export function updateAllTaskLists(
  queryClient: QueryClient,
  updater: (old: Task[]) => Task[]
) {
  // Update taskKeys.lists() queries (includes all list variants)
  queryClient.setQueriesData<Task[]>(
    { queryKey: taskKeys.lists() },
    (old) => old ? updater(old) : old
  )
  
  // Also update dashboard query
  queryClient.setQueryData<Task[]>(
    taskKeys.dashboard(),
    (old = []) => updater(old)
  )
}

// ==================== Queries ====================

/**
 * Get all tasks for current user
 * ULTRA OPTIMIZED: Instant load from cache, minimal refetching
 */
export function useTasks(options?: { limit?: number }) {
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: taskKeys.list(options),
    queryFn: async () => {
      const tasks = await api.tasks.list(options)
      
      // Populate individual task cache entries for instant detail page loads
      tasks.forEach(task => {
        queryClient.setQueryData(taskKeys.detail(task.id), task)
      })
      
      // Clean up any stale temp tasks from cache
      const now = Date.now()
      queryClient.setQueriesData<Task[]>(
        { queryKey: taskKeys.lists() },
        (old = []) => {
          return old.filter(task => {
            if (!task.id.startsWith('temp-')) return true
            const taskAge = now - new Date(task.createdAt).getTime()
            return taskAge < 5000
          })
        }
      )
      
      return tasks
    },
    // ULTRA aggressive caching - 10 minutes fresh time
    staleTime: 10 * 60 * 1000, // 10 minutes - won't refetch unless explicitly invalidated
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    // Never refetch automatically - rely on optimistic updates and manual invalidation
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false, // Don't refetch on focus for task lists
    refetchOnReconnect: false,
    // Use cache immediately, no loading states after first fetch
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Get a specific task
 * OPTIMIZED: Checks list cache first, lazy loads if needed
 */
export function useTask(id: string) {
  const isTempTask = id?.startsWith('temp-')
  
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => api.tasks.get(id),
    enabled: !!id && !isTempTask, // Don't fetch temp tasks
    // ULTRA aggressive caching for detail views - 15 minutes
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    // Use cached data immediately, never refetch on mount
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // Keep previous data while refetching (seamless UX)
    placeholderData: (previousData) => previousData,
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
    // Optimistic update - happens BEFORE server responds
    onMutate: async (newTaskData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      // Snapshot previous values
      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.lists() })

      // Create optimistic task (temporary ID, will be replaced by server)
      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        title: newTaskData.title,
        instruction: newTaskData.instruction,
        difficulty: newTaskData.difficulty,
        categories: newTaskData.categories,
        maxAgentTimeoutSec: newTaskData.maxAgentTimeoutSec,
        maxTestTimeoutSec: newTaskData.maxTestTimeoutSec,
        taskYaml: newTaskData.taskYaml || null,
        dockerComposeYaml: newTaskData.dockerComposeYaml || null,
        solutionSh: newTaskData.solutionSh || null,
        runTestsSh: newTaskData.runTestsSh || null,
        testsJson: newTaskData.testsJson || null,
        state: TaskState.DRAFT,
        authorId: '',
        reviewerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {} as any,
        reviewer: undefined,
        reviews: [],
      }

      // Optimistically update all task lists immediately (including dashboard)
      updateAllTaskLists(queryClient, (old = []) => [optimisticTask, ...old])

      return { previousTasks, optimisticTaskId: optimisticTask.id }
    },
    onError: (err, newTask, context) => {
      console.error('[useCreateTask] Task creation failed:', err)
      console.error('[useCreateTask] Failed task data:', newTask)
      
      // Rollback on error - restore previous state
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      // Also explicitly remove the temp task if rollback didn't work
      if (context?.optimisticTaskId) {
        updateAllTaskLists(queryClient, (old = []) => old.filter((t) => t.id !== context.optimisticTaskId))
      }
    },
    onSuccess: (newTask) => {
      console.log('[useCreateTask] Task created successfully:', newTask.id)
      
      // Replace optimistic task with real one from server (update all lists including dashboard)
      updateAllTaskLists(queryClient, (old = []) => {
        // Remove temp task and add real one at the start
        const filtered = old.filter((t) => !t.id.startsWith('temp-'))
        return [newTask, ...filtered]
      })
      // Set detail cache (store task directly, not wrapped)
      queryClient.setQueryData(taskKeys.detail(newTask.id), newTask)
    },
    onSettled: () => {
      // Ensure everything is in sync
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() })
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
    // Optimistic update - happens BEFORE server responds
    onMutate: async (updateData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      // Snapshot previous values
      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(id))
      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.lists() })

      // Optimistically update immediately
      if (previousTask) {
        queryClient.setQueryData<Task>(taskKeys.detail(id), {
          ...previousTask, ...updateData, updatedAt: new Date(),
        })
      }

      // Update in all lists (including dashboard)
      updateAllTaskLists(queryClient, (old = []) =>
        old.map((task) =>
          task.id === id
            ? { ...task, ...updateData, updatedAt: new Date() }
            : task
        )
      )

      return { previousTask, previousTasks }
    },
    onError: (err, updateData, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask)
      }
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: (updatedTask) => {
      // Update with real server response
      queryClient.setQueryData(taskKeys.detail(id), updatedTask)
      updateAllTaskLists(queryClient, (old = []) => old.map((task) => (task.id === id ? updatedTask : task)))
    },
    onSettled: () => {
      // Ensure everything is in sync
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() })
      // Invalidate audit logs so Activity sidebar refreshes
      queryClient.invalidateQueries({ queryKey: ['audit', 'task', id] })
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
    // Optimistic update - happens BEFORE server responds
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      // Snapshot previous values
      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(id))
      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.lists() })

      // Optimistically update state to SUBMITTED immediately
      if (previousTask) {
        queryClient.setQueryData<Task>(taskKeys.detail(id), {
          ...previousTask,
            state: TaskState.SUBMITTED,
            reviewerId: null,
            updatedAt: new Date(),
        })
      }

      // Update in all lists immediately (including dashboard)
      updateAllTaskLists(queryClient, (old = []) =>
        old.map((task) =>
          task.id === id
            ? {
                ...task,
                state: TaskState.SUBMITTED,
                reviewerId: null,
                updatedAt: new Date(),
              }
            : task
        )
      )

      return { previousTask, previousTasks }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask)
      }
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: (updatedTask) => {
      // Update with real server response
      queryClient.setQueryData(taskKeys.detail(id), updatedTask)
      updateAllTaskLists(queryClient, (old = []) => old.map((task) => (task.id === id ? updatedTask : task)))
    },
    onSettled: () => {
      // Ensure everything is in sync
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() })
      // Invalidate audit logs so Activity sidebar refreshes
      queryClient.invalidateQueries({ queryKey: ['audit', 'task', id] })
    },
  })
}

/**
 * Delete a task
 */
export function useDeleteTask(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.tasks.delete(id),
    // Optimistic update - remove from UI immediately
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      // Snapshot previous values
      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(id))
      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.lists() })

      // Optimistically remove from lists immediately (including dashboard)
      updateAllTaskLists(queryClient, (old = []) => old.filter((task) => task.id !== id))

      // Remove detail cache
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) })

      return { previousTask, previousTasks }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask)
      }
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: () => {
      // Remove from all caches
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() })
    },
    onSettled: () => {
      // Ensure everything is in sync
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() })
    },
  })
}

/**
 * Duplicate a task
 */
export function useDuplicateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.tasks.duplicate(id),
    onSuccess: (newTask) => {
      // Add the new task to lists
      updateAllTaskLists(queryClient, (old = []) => [newTask, ...old])
      
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() })
    },
  })
}
