# Harbor Task Review Tool

A comprehensive task review system for Terminal-Bench 2.0 submissions, featuring state-machine workflow, audit logging, and diff visualization.

## ✨ Features

### Core Features
- 🔐 **Secure Authentication** - Clerk-based auth with role-based access control
- 📝 **Task Management** - Create, edit, and submit tasks for review
- 🔄 **Review Workflow** - State-machine driven review process
- 👥 **Role-Based Access** - Separate interfaces for creators and reviewers
- 💾 **Persistent Storage** - PostgreSQL with Prisma ORM

### Bonus Features ✅
- 🔍 **Diff View** - Visual comparison of task changes when resubmitted
- 📊 **Audit Log** - Complete audit trail with timeline visualization
- 🎨 **Syntax Highlighting** - Beautiful code display with VS Code theme
- 🚀 **Production Ready** - Vercel deployment configuration included

> See [BONUS_FEATURES.md](./BONUS_FEATURES.md) for detailed implementation details.

## Tech Stack

- **Monorepo**: Turbo
- **Frontend**: Next.js 16 (App Router)
- **Backend**: Express.js (server + sidecar)
- **Database**: PostgreSQL with Prisma
- **Auth**: Clerk
- **Data Fetching**: TanStack Query

## Structure

- `apps/frontend` - Next.js application
- `apps/server` - Main Express API server
- `apps/sidecar` - Express service for file operations
- `packages/db` - Prisma schema and client
- `packages/types` - Shared TypeScript types

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Set up database:
```bash
npm run db:generate
npm run db:push
```

4. Start development servers:
```bash
npm run dev
```

This starts:
- Frontend on `http://localhost:3000`
- Server on `http://localhost:4000`
- Sidecar on `http://localhost:4001`

## Scripts

- `npm run dev` - Start all services in development
- `npm run build` - Build all packages and apps
- `npm run lint` - Lint all packages
- `npm run type-check` - Type check all packages
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio
- `create_tables_full.sql` - Run on SQL server for manual table creation

## 📚 Documentation

- **[CLERK_SUPABASE_INTEGRATION.md](./CLERK_SUPABASE_INTEGRATION.md)** - Authentication setup

## Clerk + Supabase Integration

This project uses Clerk for authentication with Supabase as the PostgreSQL provider. See [CLERK_SUPABASE_INTEGRATION.md](./CLERK_SUPABASE_INTEGRATION.md) for detailed setup instructions.

**Quick Setup:**
1. Activate Clerk Supabase integration in [Clerk Dashboard](https://dashboard.clerk.com/setup/supabase)
2. Add Clerk as a provider in [Supabase Dashboard](https://supabase.com/dashboard/project/_/auth/third-party)
3. Add `SUPABASE_URL` and `SUPABASE_KEY` to your `.env` file
4. (Optional) Set up RLS policies using the SQL scripts in `packages/db/prisma/migrations/`

## Security Notes

There are 3 high severity vulnerabilities reported in dev dependencies (eslint-config-next → glob). These are:
- **Not in production dependencies** - Production build has 0 vulnerabilities
- **Low risk** - The vulnerability is in the glob CLI tool, not the library when used as a dependency
- **Will be fixed** - Future versions of eslint-config-next will address this

To check production vulnerabilities only:
```bash
npm audit --production
```
