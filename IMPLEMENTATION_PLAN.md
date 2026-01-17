# Implementation Plan: Terminal-Bench Task Review Tool

## Phase 1: Database Setup ✅ (Ready to implement)

1. ✅ Update Prisma schema with Task and Review models
2. ⏳ Run SQL script to create tables in Supabase
3. ⏳ Generate Prisma client

## Phase 2: Backend API Routes

### Task Routes (`apps/server/src/routes/tasks.ts`)
- `GET /api/tasks` - List user's tasks (filtered by author)
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create new task (DRAFT state)
- `PUT /api/tasks/:id` - Update task (only if DRAFT or CHANGES_REQUESTED)
- `POST /api/tasks/:id/submit` - Submit task (DRAFT → SUBMITTED)

### Reviewer Routes (`apps/server/src/routes/reviewer.ts`)
- `GET /api/reviewer/tasks` - List tasks awaiting review (state = SUBMITTED)
- `GET /api/reviewer/tasks/:id` - Get task for review
- `POST /api/reviewer/tasks/:id/start` - Start review (SUBMITTED → IN_REVIEW)
- `POST /api/reviewer/tasks/:id/review` - Submit review decision

### State Transition Logic
Create `apps/server/src/utils/taskStateMachine.ts` to enforce valid transitions

## Phase 3: Frontend Pages

### User Pages
- `/tasks` - List user's tasks
- `/tasks/new` - Create new task
- `/tasks/[id]` - View/edit task
- `/tasks/[id]/submit` - Submit task for review

### Reviewer Pages
- `/reviewer` - Dashboard with tasks awaiting review
- `/reviewer/tasks/[id]` - Review task page

## Phase 4: UI Components

- Task list component
- Task form component
- Review form component
- Status badge component
- File upload/viewer components

## Phase 5: Deployment

- Deploy frontend to Vercel
- Deploy server to Vercel (API routes) or Railway/Render
- Set up environment variables
- Test deployed application

## Next Immediate Steps

1. **Run the SQL script** to create tables
2. **Generate Prisma client** with new schema
3. **Create task API routes**
4. **Create reviewer API routes**
5. **Build frontend pages**
