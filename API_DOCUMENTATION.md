# API Documentation

## Base URL
- Development: `http://localhost:4000`
- Production: (to be set)

All routes require authentication via Clerk (except `/health`).

## Authentication

All routes (except `/health`) require:
- Valid Clerk session token in cookies/headers
- User must exist in database (synced via `/api/auth/me`)

## Routes

### Health Check

**GET** `/health`
- Public endpoint
- Returns server status

### Authentication

**GET** `/api/auth/me`
- Get current user
- Syncs user with database if needed
- Returns: `{ user: User }`

### Task Routes (User)

All task routes require authentication and user must be the author (except GET).

#### List User's Tasks

**GET** `/api/tasks`
- Returns all tasks created by the authenticated user
- Returns: `{ tasks: Task[] }`
- Includes: author, reviewer, reviews

#### Get Task

**GET** `/api/tasks/:id`
- Get specific task details
- User must be author OR reviewer
- Returns: `{ task: Task }`
- Includes: author, reviewer, reviews

#### Create Task

**POST** `/api/tasks`
- Create new task in DRAFT state
- Body:
```json
{
  "title": "string",
  "instruction": "string",
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "categories": "string",
  "maxAgentTimeoutSec": number,
  "maxTestTimeoutSec": number,
  "taskYaml": "string (optional)",
  "dockerComposeYaml": "string (optional)",
  "solutionSh": "string (optional)",
  "runTestsSh": "string (optional)",
  "testsJson": "string (optional)"
}
```
- Returns: `{ task: Task }`

#### Update Task

**PUT** `/api/tasks/:id`
- Update task (only if DRAFT or CHANGES_REQUESTED)
- User must be the author
- Body: Same as create (all fields optional)
- Returns: `{ task: Task }`

#### Submit Task

**POST** `/api/tasks/:id/submit`
- Submit task for review
- Transitions: DRAFT → SUBMITTED, REJECTED → SUBMITTED, CHANGES_REQUESTED → SUBMITTED
- User must be the author
- Returns: `{ task: Task, message: string }`

### Reviewer Routes

All reviewer routes require:
- Authentication
- User role must be `REVIEWER`

#### List Tasks Awaiting Review

**GET** `/api/reviewer/tasks`
- Returns all tasks in SUBMITTED or IN_REVIEW state
- Returns: `{ tasks: Task[] }`
- Includes: author, reviewer, reviews
- Ordered by creation date (oldest first)

#### Get Task for Review

**GET** `/api/reviewer/tasks/:id`
- Get task details for review
- Task must be in SUBMITTED or IN_REVIEW state
- Returns: `{ task: Task }`
- Includes: author, reviewer, reviews

#### Start Review

**POST** `/api/reviewer/tasks/:id/start`
- Start reviewing a task
- Transitions: SUBMITTED → IN_REVIEW
- Assigns current reviewer to task
- Returns: `{ task: Task, message: string }`

#### Submit Review Decision

**POST** `/api/reviewer/tasks/:id/review`
- Submit review decision
- Body:
```json
{
  "decision": "APPROVE" | "REJECT" | "REQUEST_CHANGES",
  "comment": "string (optional)"
}
```
- Transitions:
  - IN_REVIEW → APPROVED (if decision is APPROVE)
  - IN_REVIEW → REJECTED (if decision is REJECT)
  - IN_REVIEW → CHANGES_REQUESTED (if decision is REQUEST_CHANGES)
- Creates review record
- Returns: `{ task: Task, review: Review, message: string }`

## State Machine

### Valid Transitions

```
DRAFT → SUBMITTED
SUBMITTED → IN_REVIEW
IN_REVIEW → APPROVED
IN_REVIEW → REJECTED
IN_REVIEW → CHANGES_REQUESTED
REJECTED → SUBMITTED (resubmit)
CHANGES_REQUESTED → SUBMITTED (resubmit after changes)
```

### State Descriptions

- **DRAFT**: User is creating/editing task
- **SUBMITTED**: Task submitted, awaiting reviewer
- **IN_REVIEW**: Reviewer is actively reviewing
- **APPROVED**: Task approved (final state)
- **REJECTED**: Task rejected (can be resubmitted)
- **CHANGES_REQUESTED**: Reviewer requested changes (can be resubmitted)

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error, invalid state transition)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized, wrong role)
- `404` - Not Found
- `500` - Internal Server Error

## Example Requests

### Create Task
```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: __clerk_db_jwt=..." \
  -d '{
    "title": "Test Task",
    "instruction": "Complete this task",
    "difficulty": "MEDIUM",
    "categories": "testing,example",
    "maxAgentTimeoutSec": 300,
    "maxTestTimeoutSec": 60
  }'
```

### Submit Task
```bash
curl -X POST http://localhost:4000/api/tasks/{taskId}/submit \
  -H "Cookie: __clerk_db_jwt=..."
```

### Submit Review
```bash
curl -X POST http://localhost:4000/api/reviewer/tasks/{taskId}/review \
  -H "Content-Type: application/json" \
  -H "Cookie: __clerk_db_jwt=..." \
  -d '{
    "decision": "APPROVE",
    "comment": "Looks good!"
  }'
```
