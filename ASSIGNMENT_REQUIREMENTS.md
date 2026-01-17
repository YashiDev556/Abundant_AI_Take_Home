# Terminal-Bench Task Review Tool - Requirements

## Overview
Build a web application for reviewing new Terminal-Bench task submissions.

## User Requirements

### Regular Users Can:
1. ✅ Sign up / log in (Clerk - already set up)
2. ⏳ Submit a new task for review
3. ⏳ View the status of their submitted tasks

### Reviewers Can:
1. ⏳ See all tasks awaiting review
2. ⏳ Approve or reject a task (with comments)
3. ⏳ Request changes on a task

## System Requirements

1. ⏳ Track each task through a review workflow
2. ✅ Persist data durably (Prisma + Supabase - already set up)
3. ⏳ Enforce valid state transitions
4. ⏳ Be deployed and accessible via a public URL (Vercel)

## Task Schema

```yaml
# task.yaml
title: "string"
instruction: "string (the prompt given to the agent)"
difficulty: easy | medium | hard
categories: "string"
max_agent_timeout_sec: number
max_test_timeout_sec: number
```

Plus all files from task directory:
- `task.yaml`
- `docker-compose.yaml`
- `solution.sh`
- `run-tests.sh`
- `tests/` directory

## Workflow States

Suggested state machine:
```
draft → submitted → in_review → approved | rejected | changes_requested
                                              ↓
                                    (resubmit) → submitted
```

## Deliverables

1. ⏳ Deployed application — accessible via a public URL
2. ✅ Source code — pushed to a GitHub repository (ready to push)
3. ⏳ Brief design doc (1 page max)

## What We're Looking For

- **Workflow design**: Well-defined state machine, enforced transitions
- **API design**: Consistent, graceful error handling
- **Data modeling**: Well-structured tasks, users, reviews
- **Authentication**: Secure sign up/login, proper access control
- **Deployment**: Reliably hosted
- **UI/UX**: Clean, clear workflow
- **Code quality**: Well-organized, maintainable

## Hints

- ✅ Use Clerk for auth (already set up)
- ✅ Deploy to Vercel (need to set up)
- ⏳ Start with workflow design
- ⏳ Consider: what happens after "changes requested"? Can rejected tasks be resubmitted?

## Bonus Features (if time permits)

- Diff view when task is resubmitted after changes
- Audit log (who did what, when)
- Syntax highlighting for scripts
- Multiple reviewers / quorum
