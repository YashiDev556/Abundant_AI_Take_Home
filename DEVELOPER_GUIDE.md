# Developer Guide

This guide provides practical examples for working with the refactored codebase.

## Table of Contents

- [Quick Start](#quick-start)
- [Backend Development](#backend-development)
- [Frontend Development](#frontend-development)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)

## Quick Start

### Adding a New Feature

The refactored architecture makes adding features straightforward:

1. **Define types** in `@repo/types`
2. **Add validation** in backend schemas
3. **Implement service** in backend services
4. **Create route** in backend routes
5. **Add hook** in frontend hooks
6. **Use in component** in frontend pages

## Backend Development

### Creating a New Route

```typescript
// 1. Create validation schema (src/lib/schemas.ts)
export const createCommentSchema = z.object({
  taskId: z.string().cuid(),
  content: z.string().min(1).max(1000),
})

// 2. Create service (src/services/comment.service.ts)
export class CommentService {
  static async createComment(
    taskId: string,
    content: string,
    userId: string
  ): Promise<Comment> {
    // Validate task exists
    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) {
      throw new NotFoundError('Task')
    }

    // Create comment
    return await prisma.comment.create({
      data: { taskId, content, userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
  }
}

// 3. Create route (src/routes/comments.ts)
import { Router } from 'express'
import { CommentService } from '../services/comment.service'
import { attachUser, getUserFromRequest } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { createCommentSchema } from '../lib/schemas'

export const commentsRouter = Router()
commentsRouter.use(attachUser)

commentsRouter.post(
  '/',
  validateBody(createCommentSchema),
  async (req, res, next) => {
    try {
      const user = getUserFromRequest(req)
      const { taskId, content } = req.validatedBody as any
      const comment = await CommentService.createComment(taskId, content, user.id)
      res.status(HTTP_STATUS.CREATED).json({ comment })
    } catch (error) {
      next(error)
    }
  }
)

// 4. Register route (src/index.ts)
import { commentsRouter } from './routes/comments'
app.use('/api/comments', requireAuth(), commentsRouter)
```

### Error Handling Best Practices

```typescript
// ✅ Good - Use custom error classes
if (!task) {
  throw new NotFoundError('Task')
}

if (task.authorId !== userId) {
  throw new ForbiddenError('Only the author can edit this task')
}

if (!isValid) {
  throw new BadRequestError('Invalid input', validationErrors)
}

// ❌ Bad - Generic errors
if (!task) {
  throw new Error('Task not found') // No status code
}

// ❌ Bad - Manual response
if (!task) {
  return res.status(404).json({ error: 'Not found' }) // Inconsistent format
}
```

### Using Shared Constants

```typescript
import {
  TaskState,
  canEditTask,
  ERROR_MESSAGES,
  TASK_INCLUDE_FULL,
  HTTP_STATUS,
} from '@repo/types'

// Check permissions
if (!canEditTask(task.state)) {
  throw new BadRequestError(ERROR_MESSAGES.TASK_NOT_EDITABLE)
}

// Use standard includes
const tasks = await prisma.task.findMany({
  include: TASK_INCLUDE_FULL, // Consistent across all queries
})

// Return proper status codes
res.status(HTTP_STATUS.CREATED).json({ task })
```

### Validation Examples

```typescript
// Define schema
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
})

// Use in route
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateUserSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const data = req.validatedBody as any
      // data is now validated and typed
    } catch (error) {
      next(error)
    }
  }
)
```

## Frontend Development

### Using API Hooks

```typescript
'use client'

import { useTasks, useCreateTask } from '@/hooks'
import { CreateTaskDto, Difficulty } from '@repo/types'

export default function TasksPage() {
  // Fetch data
  const { data: tasks = [], isLoading, error } = useTasks()

  // Mutations
  const createMutation = useCreateTask()

  const handleCreate = (data: CreateTaskDto) => {
    createMutation.mutate(data, {
      onSuccess: (newTask) => {
        console.log('Created:', newTask)
        // React Query automatically updates cache
      },
      onError: (error) => {
        console.error('Failed:', error)
      },
    })
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorAlert error={error} />

  return (
    <div>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
```

### Creating Custom Hooks

```typescript
// src/hooks/use-task-filters.ts
import { useState, useMemo } from 'react'
import { Task, TaskState, Difficulty } from '@repo/types'

export function useTaskFilters(tasks: Task[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<TaskState | 'all'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all')

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.instruction.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesState = stateFilter === 'all' || task.state === stateFilter
      const matchesDifficulty =
        difficultyFilter === 'all' || task.difficulty === difficultyFilter
      return matchesSearch && matchesState && matchesDifficulty
    })
  }, [tasks, searchQuery, stateFilter, difficultyFilter])

  return {
    filteredTasks,
    searchQuery,
    setSearchQuery,
    stateFilter,
    setStateFilter,
    difficultyFilter,
    setDifficultyFilter,
  }
}

// Usage in component
const { data: tasks = [] } = useTasks()
const {
  filteredTasks,
  searchQuery,
  setSearchQuery,
  stateFilter,
  setStateFilter,
} = useTaskFilters(tasks)
```

### Using UI Utilities

```typescript
import {
  getStateBadgeClass,
  getDifficultyBadgeClass,
  getStateIcon,
  formatDate,
  formatCount,
  truncateText,
} from '@/lib/ui-utils'
import { Task, TaskState } from '@repo/types'

function TaskCard({ task }: { task: Task }) {
  const StateIcon = getStateIcon(task.state)

  return (
    <div>
      <StateIcon className={getStateColor(task.state)} />
      <h3>{task.title}</h3>
      <p>{truncateText(task.instruction, 150)}</p>
      
      <Badge className={getStateBadgeClass(task.state)}>
        {task.state.replace('_', ' ')}
      </Badge>
      
      <Badge className={getDifficultyBadgeClass(task.difficulty)}>
        {task.difficulty}
      </Badge>
      
      <span>{formatDate(task.createdAt)}</span>
      <span>{formatCount(task.reviews?.length || 0, 'review')}</span>
    </div>
  )
}
```

### Type-Safe API Calls

```typescript
import { api } from '@/lib/api-client'
import { CreateTaskDto, Difficulty } from '@repo/types'

// Direct API calls (when not using hooks)
async function createTask() {
  const data: CreateTaskDto = {
    title: 'My Task',
    instruction: 'Do something',
    difficulty: Difficulty.MEDIUM,
    categories: 'testing',
    maxAgentTimeoutSec: 300,
    maxTestTimeoutSec: 60,
  }

  try {
    const task = await api.tasks.create(data) // Fully typed
    console.log(task.id, task.state) // TypeScript knows these exist
  } catch (error) {
    console.error('Failed to create task:', error)
  }
}
```

## Common Patterns

### Pattern 1: Fetching and Displaying Data

```typescript
'use client'

import { useTasks } from '@/hooks'
import { TaskState } from '@repo/types'
import { getStateBadgeClass } from '@/lib/ui-utils'

export default function TaskList() {
  const { data: tasks = [], isLoading, error } = useTasks()

  if (isLoading) return <Skeleton />
  if (error) return <Alert variant="destructive">{error.message}</Alert>

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <Card key={task.id}>
          <h3>{task.title}</h3>
          <Badge className={getStateBadgeClass(task.state)}>
            {task.state}
          </Badge>
        </Card>
      ))}
    </div>
  )
}
```

### Pattern 2: Creating with Optimistic Updates

```typescript
import { useCreateTask } from '@/hooks'
import { useQueryClient } from '@tanstack/react-query'

function CreateTaskForm() {
  const queryClient = useQueryClient()
  const createMutation = useCreateTask()

  const handleSubmit = (data: CreateTaskDto) => {
    createMutation.mutate(data, {
      onSuccess: (newTask) => {
        // React Query automatically invalidates and refetches
        // Or do manual optimistic update:
        queryClient.setQueryData<Task[]>(['tasks', 'list'], (old = []) => [
          newTask,
          ...old,
        ])
      },
    })
  }

  return <TaskForm onSubmit={handleSubmit} isLoading={createMutation.isPending} />
}
```

### Pattern 3: State Machine Validation

```typescript
import { canEditTask, canSubmitTask, TaskState } from '@repo/types'

function TaskActions({ task }: { task: Task }) {
  const canEdit = canEditTask(task.state)
  const canSubmit = canSubmitTask(task.state)

  return (
    <div className="flex gap-2">
      {canEdit && (
        <Button onClick={() => handleEdit(task)}>Edit</Button>
      )}
      {canSubmit && (
        <Button onClick={() => handleSubmit(task)}>Submit for Review</Button>
      )}
    </div>
  )
}
```

### Pattern 4: Error Handling in Components

```typescript
import { useState } from 'react'
import { useCreateTask } from '@/hooks'
import { Alert, AlertDescription } from '@/components/ui/alert'

function CreateTask() {
  const createMutation = useCreateTask()
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (data: CreateTaskDto) => {
    setLocalError(null)

    createMutation.mutate(data, {
      onError: (error) => {
        setLocalError(error.message)
      },
    })
  }

  return (
    <>
      {(localError || createMutation.error) && (
        <Alert variant="destructive">
          <AlertDescription>
            {localError || (createMutation.error as Error).message}
          </AlertDescription>
        </Alert>
      )}
      <TaskForm onSubmit={handleSubmit} />
    </>
  )
}
```

## Best Practices

### DO ✅

```typescript
// 1. Use shared types
import { Task, TaskState, canEditTask } from '@repo/types'

// 2. Use custom hooks for data fetching
const { data: tasks } = useTasks()

// 3. Use utility functions
const badgeClass = getStateBadgeClass(task.state)

// 4. Throw custom errors
throw new NotFoundError('Task')

// 5. Validate with schemas
validateBody(createTaskSchema)

// 6. Use constants
if (task.state === TaskState.DRAFT)

// 7. Keep components focused
function TaskCard({ task }: { task: Task }) {
  return <Card>...</Card>
}

// 8. Use service layer
await TaskService.createTask(data, userId)
```

### DON'T ❌

```typescript
// 1. Don't use 'any'
const data: any = await fetch(...) // ❌

// 2. Don't duplicate logic
if (state === 'DRAFT' || state === 'CHANGES_REQUESTED') // ❌
// Use: canEditTask(state)

// 3. Don't access database from routes
router.post('/', async (req, res) => {
  const task = await prisma.task.create({...}) // ❌
})
// Use: await TaskService.createTask(...)

// 4. Don't throw generic errors
throw new Error('Not found') // ❌
// Use: throw new NotFoundError('Task')

// 5. Don't call API directly from components
const data = await fetch('/api/tasks') // ❌
// Use: const { data } = useTasks()

// 6. Don't hardcode strings
if (task.state === 'DRAFT') // ❌
// Use: if (task.state === TaskState.DRAFT)
```

### Code Organization

```
✅ Group by feature:
src/
  features/
    tasks/
      TaskList.tsx
      TaskCard.tsx
      TaskForm.tsx
      use-tasks.ts

✅ Separate concerns:
src/
  hooks/          # Data fetching
  components/     # UI components
  lib/            # Utilities
  app/            # Pages

✅ Use barrel exports:
src/hooks/index.ts:
  export * from './use-tasks'
  export * from './use-reviews'
```

## Testing Examples

### Backend Service Tests

```typescript
// task.service.test.ts
import { TaskService } from '../services/task.service'
import { prisma } from '@repo/db'
import { NotFoundError, ForbiddenError } from '../lib/errors'

describe('TaskService', () => {
  describe('createTask', () => {
    it('creates a task in DRAFT state', async () => {
      const data = {
        title: 'Test Task',
        instruction: 'Do something',
        // ... other fields
      }
      
      const task = await TaskService.createTask(data, 'user-123')
      
      expect(task.state).toBe(TaskState.DRAFT)
      expect(task.authorId).toBe('user-123')
    })
  })

  describe('updateTask', () => {
    it('throws NotFoundError if task does not exist', async () => {
      await expect(
        TaskService.updateTask('invalid-id', {}, mockUser)
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError if user is not author', async () => {
      // ... test implementation
    })
  })
})
```

### Frontend Hook Tests

```typescript
// use-tasks.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTasks } from './use-tasks'

const createWrapper = () => {
  const queryClient = new QueryClient()
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useTasks', () => {
  it('fetches tasks successfully', async () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(3)
  })
})
```

## Troubleshooting

### Common Issues

**Issue: Type errors after importing from `@repo/types`**
```bash
# Solution: Rebuild the types package
cd packages/types
npm run build
```

**Issue: API calls fail with 401**
```typescript
// Check authentication token is being sent
// Verify Clerk session is active
// Check middleware is applied to route
```

**Issue: React Query not refetching**
```typescript
// Ensure query keys are consistent
// Check if invalidation is called
queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
```

**Issue: Validation errors not showing**
```typescript
// Check schema is being used
// Verify error handling in mutation
createMutation.mutate(data, {
  onError: (error) => {
    console.log(error) // Debug error object
  },
})
```

## Resources

- [Architecture Documentation](./ARCHITECTURE.md) - Detailed architecture overview
- [Refactoring Summary](./REFACTORING_SUMMARY.md) - Changes made during refactoring
- [API Documentation](./API_DOCUMENTATION.md) - API endpoint reference

## Getting Help

1. Check type definitions in `@repo/types`
2. Look for similar patterns in existing code
3. Review error messages (they're descriptive!)
4. Check the architecture documentation
5. Debug with TypeScript language server
