# Design Document: Terminal-Bench Task Review Tool

## Workflow State Machine

### States
1. **DRAFT** - User is creating/editing a task submission
2. **SUBMITTED** - Task has been submitted for review
3. **IN_REVIEW** - A reviewer is currently reviewing the task
4. **APPROVED** - Task has been approved and is ready for use
5. **REJECTED** - Task has been rejected (can be resubmitted)
6. **CHANGES_REQUESTED** - Reviewer requested changes (can be resubmitted)

### State Transitions

```
DRAFT → SUBMITTED (user action)
SUBMITTED → IN_REVIEW (automatic when reviewer starts)
IN_REVIEW → APPROVED (reviewer action)
IN_REVIEW → REJECTED (reviewer action)
IN_REVIEW → CHANGES_REQUESTED (reviewer action)
REJECTED → SUBMITTED (user resubmits)
CHANGES_REQUESTED → SUBMITTED (user resubmits after changes)
```

### Transition Rules
- Only users can submit tasks (DRAFT → SUBMITTED)
- Only reviewers can change status from IN_REVIEW
- REJECTED and CHANGES_REQUESTED tasks can be resubmitted
- Once APPROVED, task cannot be changed (final state)

## Data Modeling

### User Model (Already exists)
```prisma
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  name      String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tasks    Task[]
  reviews  Review[]
}
```

### Task Model (To be created)
```prisma
model Task {
  id          String      @id @default(cuid())
  title       String
  instruction String      // The prompt given to the agent
  difficulty  Difficulty  // easy | medium | hard
  categories  String      // Comma-separated or JSON
  maxAgentTimeoutSec Int
  maxTestTimeoutSec  Int
  
  // File storage (store in Supabase Storage or as JSON)
  taskYaml          String?  // Content of task.yaml
  dockerComposeYaml  String?  // Content of docker-compose.yaml
  solutionSh        String?  // Content of solution.sh
  runTestsSh        String?  // Content of run-tests.sh
  testsJson         String?  // JSON representation of tests/
  
  state       TaskState  @default(DRAFT)
  authorId    String
  reviewerId  String?    // Current reviewer
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  author      User       @relation(fields: [authorId], references: [id])
  reviewer    User?      @relation(fields: [reviewerId], references: [id])
  reviews     Review[]
}
```

### Review Model (To be created)
```prisma
model Review {
  id          String         @id @default(cuid())
  taskId      String
  reviewerId  String
  decision    ReviewDecision // APPROVE | REJECT | REQUEST_CHANGES
  comment     String?        // Reviewer's comment
  createdAt   DateTime       @default(now())
  
  task        Task           @relation(fields: [taskId], references: [id])
  reviewer    User           @relation(fields: [reviewerId], references: [id])
}
```

### Enums
```prisma
enum UserRole {
  USER
  REVIEWER
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum TaskState {
  DRAFT
  SUBMITTED
  IN_REVIEW
  APPROVED
  REJECTED
  CHANGES_REQUESTED
}

enum ReviewDecision {
  APPROVE
  REJECT
  REQUEST_CHANGES
}
```

## Key Technical Decisions

### 1. File Storage
**Decision**: Store file contents as text/JSON in database
**Rationale**: 
- Simpler than setting up object storage
- Files are relatively small (scripts, YAML)
- Easy to version and diff
- Can migrate to Supabase Storage later if needed

**Tradeoff**: May hit database size limits with many large files

### 2. State Machine Enforcement
**Decision**: Enforce at application level (API routes)
**Rationale**:
- Type-safe with TypeScript
- Clear error messages
- Easy to test
- Can add database constraints later

**Tradeoff**: Need to ensure all API routes enforce rules

### 3. Role-Based Access Control
**Decision**: Use Clerk + database User.role field
**Rationale**:
- Clerk handles authentication
- Simple role check in middleware
- Easy to extend with more roles

**Tradeoff**: Role changes require database update (could use Clerk metadata)

### 4. Monorepo Structure
**Decision**: Keep existing Turbo monorepo
**Rationale**:
- Already set up
- Good separation of concerns
- Easy to scale

## API Design

### Task Endpoints
- `POST /api/tasks` - Create new task (DRAFT)
- `GET /api/tasks` - List user's tasks
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task (only if DRAFT or CHANGES_REQUESTED)
- `POST /api/tasks/:id/submit` - Submit task for review (DRAFT → SUBMITTED)

### Reviewer Endpoints
- `GET /api/reviewer/tasks` - List tasks awaiting review
- `GET /api/reviewer/tasks/:id` - Get task for review
- `POST /api/reviewer/tasks/:id/review` - Submit review decision

### State Transition Logic
```typescript
// In API route
if (currentState === 'DRAFT' && newState === 'SUBMITTED') {
  // Allow if user is author
}
if (currentState === 'IN_REVIEW' && ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(newState)) {
  // Allow if user is reviewer
}
// etc.
```

## What I'd Improve With More Time

1. **File Storage**: Move to Supabase Storage for better scalability
2. **Versioning**: Track task versions when resubmitted (for diff view)
3. **Audit Log**: Add audit_log table to track all state changes
4. **Email Notifications**: Notify users when task status changes
5. **File Validation**: Validate YAML syntax, script syntax before submission
6. **Bulk Operations**: Allow reviewers to review multiple tasks
7. **Search/Filter**: Add search and filtering for tasks
8. **Comments Thread**: Allow threaded comments on tasks
9. **Task Templates**: Pre-fill common task structures
10. **Export**: Export approved tasks in Terminal-Bench format
