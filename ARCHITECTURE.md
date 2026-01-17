# Architecture Documentation

This document describes the refactored architecture of the Terminal-Bench Task Review Platform.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Shared Packages](#shared-packages)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Design Principles](#design-principles)
- [Patterns and Conventions](#patterns-and-conventions)

## Overview

The application is built as a monorepo using Turbo, with three main applications and two shared packages:

- **Apps:**
  - `apps/frontend` - Next.js 14 frontend application
  - `apps/server` - Express.js backend API
  - `apps/sidecar` - Auxiliary service for file operations
- **Packages:**
  - `packages/types` - Shared TypeScript types, constants, and utilities
  - `packages/db` - Prisma database client and schema

## Project Structure

```
/
├── apps/
│   ├── frontend/           # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/        # Next.js app router pages
│   │   │   ├── components/ # React components
│   │   │   ├── contexts/   # React contexts
│   │   │   ├── hooks/      # Custom React hooks
│   │   │   └── lib/        # Utilities and API client
│   │   └── package.json
│   ├── server/             # Express backend
│   │   ├── src/
│   │   │   ├── lib/        # Error classes and schemas
│   │   │   ├── middleware/ # Express middleware
│   │   │   ├── routes/     # API route handlers
│   │   │   ├── services/   # Business logic layer
│   │   │   └── index.ts    # App entry point
│   │   └── package.json
│   └── sidecar/            # Auxiliary service
│       ├── src/
│       │   ├── lib/        # Error classes
│       │   ├── middleware/ # Express middleware
│       │   ├── routes/     # API routes
│       │   └── index.ts    # App entry point
│       └── package.json
└── packages/
    ├── types/              # Shared types package
    │   ├── src/
    │   │   ├── index.ts    # Type definitions
    │   │   ├── constants.ts# Application constants
    │   │   └── utils.ts    # Business logic utilities
    │   └── package.json
    └── db/                 # Database package
        ├── prisma/
        │   └── schema.prisma
        └── package.json
```

## Shared Packages

### `@repo/types`

The types package provides comprehensive shared types and utilities:

#### Type Definitions

- **Enums:** `UserRole`, `Difficulty`, `TaskState`, `ReviewDecision`
- **Domain Models:** `User`, `Task`, `Review`, `UserSummary`
- **DTOs:** `CreateTaskDto`, `UpdateTaskDto`, `SubmitReviewDto`
- **API Responses:** `ApiResponse<T>`, `TaskResponse`, `TasksResponse`, etc.
- **Type Guards:** `isTaskState()`, `isDifficulty()`, etc.

#### Constants (`constants.ts`)

- State machine transitions: `VALID_TASK_TRANSITIONS`
- Decision mappings: `DECISION_TO_STATE`
- State validation: `EDITABLE_STATES`, `SUBMITTABLE_STATES`, `REVIEWABLE_STATES`
- UI constants: `STATE_LABELS`, `STATE_BADGE_CLASSES`, `STATE_COLORS`
- Validation limits: `FIELD_LIMITS`, `DEFAULT_TIMEOUTS`, `MIN_TIMEOUTS`, `MAX_TIMEOUTS`
- HTTP status codes: `HTTP_STATUS`
- Error messages: `ERROR_MESSAGES`
- Database query patterns: `TASK_INCLUDE_AUTHOR_REVIEWER`, `TASK_INCLUDE_FULL`

#### Utilities (`utils.ts`)

- **State Machine Logic:**
  - `isValidTaskTransition(currentState, newState)` - Validate state transitions
  - `getStateFromDecision(decision)` - Map review decision to task state
  - `canEditTask(state)` - Check if task is editable
  - `canSubmitTask(state)` - Check if task can be submitted
  - `isTaskReviewable(state)` - Check if task can be reviewed
  - `isFinalState(state)` - Check if state is terminal

- **Display Helpers:**
  - `getStateLabel(state)` - Get human-readable state label
  - `getDifficultyLabel(difficulty)` - Get difficulty label
  - `getStateBadgeClass(state)` - Get CSS class for state badge
  - `getDifficultyBadgeClass(difficulty)` - Get CSS class for difficulty badge
  - `getStateColor(state)` - Get color class for state

- **Permission Helpers:**
  - `canUserEditTask(userId, authorId, taskState)` - Check edit permission
  - `canUserSubmitTask(userId, authorId, taskState)` - Check submit permission
  - `isReviewerRole(role)` - Check if user is reviewer
  - `canUserReviewTask(userRole, taskState)` - Check review permission

- **Formatting Helpers:**
  - `formatDate(date)` - Format date for display
  - `formatDateTime(date)` - Format date and time
  - `getRelativeTime(date)` - Get "X hours ago" format
  - `truncateText(text, maxLength)` - Truncate long text
  - `parseCategories(categories)` - Parse comma-separated categories
  - `groupBy(items, keyFn)` - Group items by key function
  - `sortBy(items, keyFn, order)` - Sort items

### `@repo/db`

Prisma database client with PostgreSQL schema. Exports:

- `prisma` - Prisma client instance
- Prisma-generated types: `User`, `Task`, `Review`, `TaskState`, etc.

## Backend Architecture

### Layered Architecture

The backend follows a clean layered architecture:

```
Routes → Services → Database
  ↓
Middleware
  ↓
Error Handlers
```

#### 1. Routes Layer (`src/routes/`)

- **Purpose:** HTTP request handling and response formatting
- **Responsibility:** Route definition, request validation, response serialization
- **Pattern:** Thin controllers that delegate to services

**Files:**
- `auth.ts` - Authentication endpoints
- `tasks.ts` - Task CRUD operations
- `reviewer.ts` - Review operations

**Example:**
```typescript
tasksRouter.post(
  '/',
  validateBody(createTaskSchema),
  async (req, res, next) => {
    try {
      const user = getUserFromRequest(req)
      const task = await TaskService.createTask(req.validatedBody, user.id)
      res.status(HTTP_STATUS.CREATED).json({ task })
    } catch (error) {
      next(error)
    }
  }
)
```

#### 2. Services Layer (`src/services/`)

- **Purpose:** Business logic and data access
- **Responsibility:** Validation, authorization, database operations
- **Pattern:** Static methods organized by domain

**Files:**
- `task.service.ts` - Task business logic
- `review.service.ts` - Review business logic

**Example:**
```typescript
export class TaskService {
  static async createTask(data: CreateTaskInput, authorId: string): Promise<Task> {
    return await prisma.task.create({
      data: { ...data, state: TaskState.DRAFT, authorId },
      include: TASK_INCLUDE_FULL,
    })
  }
}
```

#### 3. Middleware Layer (`src/middleware/`)

- **Purpose:** Request preprocessing and validation
- **Files:**
  - `auth.ts` - Authentication and authorization
  - `validation.ts` - Request validation using Zod
  - `errorHandler.ts` - Global error handling

**Middleware Functions:**
- `attachUser` - Extract and attach user from Clerk session
- `requireUser` - Ensure user is authenticated
- `requireReviewer` - Ensure user has reviewer role
- `validateBody(schema)` - Validate request body
- `validateParams(schema)` - Validate route parameters
- `validateQuery(schema)` - Validate query parameters

#### 4. Library Layer (`src/lib/`)

- **errors.ts** - Custom error classes:
  - `ApiError` - Base error class
  - `BadRequestError` - 400 errors
  - `UnauthorizedError` - 401 errors
  - `ForbiddenError` - 403 errors
  - `NotFoundError` - 404 errors
  - `ValidationError` - 422 errors
  - `InternalError` - 500 errors

- **schemas.ts** - Zod validation schemas:
  - `createTaskSchema` - Task creation validation
  - `updateTaskSchema` - Task update validation
  - `submitReviewSchema` - Review submission validation
  - `idParamSchema` - ID parameter validation

### Error Handling

All errors are handled consistently:

1. Throw custom error classes in services/routes
2. Errors bubble up to global error handler
3. Error handler formats response based on error type
4. Development mode includes stack traces

## Frontend Architecture

### Component-Based Architecture

The frontend uses React with Next.js 14 App Router:

```
Pages → Hooks → API Client → Backend
  ↓
UI Components
  ↓
Shared Utilities
```

#### 1. Pages Layer (`src/app/`)

- **Purpose:** Route definitions and page components
- **Pattern:** Server Components where possible, Client Components for interactivity
- **Structure:**
  - `tasks/page.tsx` - Task list page
  - `tasks/[id]/page.tsx` - Task detail page
  - `reviewer/page.tsx` - Reviewer dashboard
  - `reviewer/tasks/[id]/page.tsx` - Review task page

#### 2. Hooks Layer (`src/hooks/`)

- **Purpose:** Data fetching and state management with React Query
- **Pattern:** Custom hooks wrapping React Query

**Files:**
- `use-tasks.ts` - Task operations hooks
- `use-reviews.ts` - Review operations hooks

**Hooks:**
- `useTasks()` - Fetch task list
- `useTask(id)` - Fetch single task
- `useCreateTask()` - Create task mutation
- `useUpdateTask(id)` - Update task mutation
- `useSubmitTask(id)` - Submit task mutation
- `useReviewTasks()` - Fetch tasks for review
- `useStartReview(id)` - Start review mutation
- `useSubmitReview(id)` - Submit review mutation

**Example:**
```typescript
export function useTasks() {
  return useQuery({
    queryKey: taskKeys.lists(),
    queryFn: () => api.tasks.list(),
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskDto) => api.tasks.create(data),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}
```

#### 3. API Client Layer (`src/lib/api-client.ts`)

- **Purpose:** Type-safe HTTP communication
- **Pattern:** Service classes with typed methods

**Structure:**
```typescript
class ApiClient {
  private request<T>(endpoint, options): Promise<T>
  async get<T>(endpoint): Promise<T>
  async post<T>(endpoint, data): Promise<T>
  async put<T>(endpoint, data): Promise<T>
  async delete<T>(endpoint): Promise<T>
}

class TasksService {
  constructor(private client: ApiClient)
  async list(): Promise<Task[]>
  async get(id: string): Promise<Task>
  async create(data: CreateTaskDto): Promise<Task>
  async update(id: string, data: UpdateTaskDto): Promise<Task>
  async submit(id: string): Promise<Task>
}

export const api = {
  auth: new AuthService(apiClient),
  tasks: new TasksService(apiClient),
  reviewer: new ReviewerService(apiClient),
}
```

#### 4. UI Utilities Layer (`src/lib/ui-utils.ts`)

- **Purpose:** UI helper functions
- **Functions:**
  - Badge class helpers: `getStateBadgeClass()`, `getDifficultyBadgeClass()`
  - Icon mappers: `getStateIcon()`, `getDecisionIcon()`
  - Color helpers: `getStateColor()`, `getDecisionColor()`
  - Formatters: `formatCategories()`, `formatTimeout()`, `formatCount()`

#### 5. Components Layer (`src/components/`)

- **ui/** - shadcn/ui components (Button, Card, Dialog, etc.)
- **modals/** - Reusable modal components
  - `task-form-modal.tsx` - Task create/edit form
  - `review-modal.tsx` - Review submission form
  - `confirm-modal.tsx` - Confirmation dialog
- **app-sidebar.tsx** - Application navigation

## Design Principles

### 1. Type Safety

- All data flows are fully typed using TypeScript
- Shared types eliminate duplication and ensure consistency
- Runtime validation with Zod schemas
- Type guards for safe type narrowing

### 2. Separation of Concerns

- **Backend:** Routes → Services → Database
- **Frontend:** Pages → Hooks → API → Backend
- Business logic in services, not in routes or pages
- Presentation logic in components, not in hooks

### 3. DRY (Don't Repeat Yourself)

- Shared utilities in `@repo/types`
- State machine logic centralized
- UI helpers consolidated
- Common patterns abstracted into reusable functions

### 4. Single Source of Truth

- Constants defined once in `@repo/types`
- State transitions defined in `VALID_TASK_TRANSITIONS`
- Validation rules in Zod schemas
- Database schema in Prisma

### 5. Error Handling

- Custom error classes with proper status codes
- Consistent error responses across all endpoints
- Detailed error messages in development
- Secure error messages in production

### 6. Scalability

- Service layer for easy testing
- Middleware for cross-cutting concerns
- React Query for caching and state management
- Modular component architecture

## Patterns and Conventions

### Naming Conventions

- **Files:** kebab-case (e.g., `task-service.ts`, `use-tasks.ts`)
- **Components:** PascalCase (e.g., `TaskFormModal`, `ConfirmModal`)
- **Functions:** camelCase (e.g., `createTask`, `getUserFromRequest`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `HTTP_STATUS`, `ERROR_MESSAGES`)
- **Types/Interfaces:** PascalCase (e.g., `Task`, `CreateTaskDto`)

### File Organization

- Group by feature, not by type
- Co-locate related files
- Barrel exports (`index.ts`) for clean imports
- Separate concerns within each layer

### Code Style

- Descriptive variable and function names
- JSDoc comments for public APIs
- Consistent error handling
- Early returns for guard clauses
- Explicit type annotations for public APIs

### Testing Strategy (Future)

- **Unit Tests:** Services and utilities
- **Integration Tests:** API endpoints
- **E2E Tests:** Critical user flows
- **Test Location:** Co-located with source files

## Best Practices

### Backend

1. **Always use custom error classes** instead of throwing generic errors
2. **Validate all input** using Zod schemas
3. **Use services for business logic** - keep routes thin
4. **Include standard fields** in database queries (use constants)
5. **Handle async errors** with try/catch and next(error)

### Frontend

1. **Use hooks for data fetching** - don't call API directly from components
2. **Leverage React Query** for caching and synchronization
3. **Extract reusable logic** into custom hooks
4. **Use shared utilities** from `@repo/types` and `ui-utils`
5. **Keep components focused** - single responsibility principle

### Shared Packages

1. **Export everything from index.ts** for clean imports
2. **Document all public APIs** with JSDoc
3. **Provide type guards** for enum validation
4. **Keep utilities pure** - no side effects
5. **Version carefully** - changes affect all apps

## Future Improvements

1. **Add comprehensive test coverage**
2. **Implement request/response logging**
3. **Add rate limiting and throttling**
4. **Implement file upload/download in sidecar**
5. **Add real-time updates with WebSockets**
6. **Implement audit logging**
7. **Add performance monitoring**
8. **Create API documentation with OpenAPI/Swagger**
9. **Implement CI/CD pipelines**
10. **Add database migrations management**
