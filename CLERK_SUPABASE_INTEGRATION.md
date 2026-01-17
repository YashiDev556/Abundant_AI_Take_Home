# Clerk + Supabase Integration Guide

This guide explains how to integrate Clerk with Supabase following the [official Clerk documentation](https://clerk.com/docs/guides/development/integrations/databases/supabase).

## Overview

This integration allows you to:
- Use Clerk for authentication while leveraging Supabase as your PostgreSQL provider
- Optionally use Supabase Row Level Security (RLS) policies with Clerk session tokens
- Keep using Prisma as your ORM (no Supabase JS client required)

## Step 1: Set up Clerk as a Supabase Third-Party Auth Provider

### In Clerk Dashboard:

1. Navigate to the [Supabase integration setup](https://dashboard.clerk.com/setup/supabase)
2. Select your configuration options
3. Click **Activate Supabase integration**
4. Copy the **Clerk domain** that appears (e.g., `your-app.clerk.accounts.dev`)

### In Supabase Dashboard:

1. Navigate to [**Authentication > Sign In / Up**](https://supabase.com/dashboard/project/_/auth/third-party)
2. Click **Add provider**
3. Select **Clerk** from the list
4. Paste the **Clerk domain** you copied from Clerk Dashboard
5. Save the configuration

## Step 2: Update Environment Variables

Add the following to your `.env` file:

```bash
# Supabase Configuration (for RLS and future Supabase features)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key

# Clerk Configuration (already set up)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database URLs (already set up)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

**To get Supabase credentials:**
1. Go to [Supabase Dashboard > Project Settings > API](https://supabase.com/dashboard/project/_/settings/api)
2. Copy the **Project URL** → `SUPABASE_URL`
3. Copy the **anon public** key → `SUPABASE_KEY`

**Note:** `SUPABASE_URL` and `SUPABASE_KEY` are optional if you're only using Prisma. They're needed if you want to:
- Use Supabase RLS policies
- Use Supabase client features (Realtime, Storage, etc.)
- Set up webhooks

## Step 3: Optional - Set up Row Level Security (RLS)

If you want to use Supabase RLS policies with Clerk, you can create policies that restrict access based on Clerk user IDs.

### Example: RLS Policy for User Table

Run this SQL in [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new):

```sql
-- Enable RLS on users table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own record
CREATE POLICY "Users can view their own data"
ON "public"."users"
FOR SELECT
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = "clerkId"
);

-- Policy: Users can update their own record
CREATE POLICY "Users can update their own data"
ON "public"."users"
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = "clerkId"
);
```

### Example: RLS Policy for Tasks Table

```sql
-- Create tasks table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "tasks" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tasks
CREATE POLICY "Users can view their own tasks"
ON "public"."tasks"
FOR SELECT
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = "user_id"
);

-- Policy: Users can insert their own tasks
CREATE POLICY "Users can insert their own tasks"
ON "public"."tasks"
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.jwt()->>'sub') = "user_id"
);

-- Policy: Users can update their own tasks
CREATE POLICY "Users can update their own tasks"
ON "public"."tasks"
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = "user_id"
);

-- Policy: Users can delete their own tasks
CREATE POLICY "Users can delete their own tasks"
ON "public"."tasks"
FOR DELETE
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = "user_id"
);
```

## Step 4: Using Clerk Session Tokens with Prisma

Since we're using Prisma (not Supabase JS client), RLS policies will automatically apply when queries are made through Supabase's connection pool. However, you need to ensure Clerk session tokens are passed correctly.

### For Express Server

When making Prisma queries, the RLS policies will use the Clerk session token from the request. Make sure your Express routes are protected with Clerk middleware:

```typescript
// apps/server/src/routes/api/index.ts
import { getAuth } from '@clerk/express'
import { prisma } from '@repo/db'

// Clerk middleware already applied in index.ts
// RLS policies will automatically use the Clerk session token
```

### Optional: Using Supabase Client

If you want to use Supabase client features (Realtime, Storage, etc.) alongside Prisma:

1. Install the Supabase client:
```bash
npm install @supabase/supabase-js --workspace=@repo/db
```

2. Use the helper function from `@repo/db`:
```typescript
import { createClerkSupabaseClient } from '@repo/db/supabase'
import { auth } from '@clerk/nextjs/server'

// In a server component
const client = createClerkSupabaseClient(async () => {
  return (await auth()).getToken()
})

// Now you can use Supabase features
const { data } = await client.from('tasks').select()
```

### Important Notes

1. **RLS is optional**: Since you're using Prisma and application-level auth with Clerk, RLS is not required. You can handle authorization in your application code.

2. **Connection Pooling**: If using Supabase connection pooling, RLS policies will apply. If using direct connections, RLS may not work as expected.

3. **Session Tokens**: The Clerk Supabase integration adds `"role": "authenticated"` to session tokens, which is required for RLS policies to work.

## Step 5: Verify Integration

1. **Test Authentication**:
   - Sign in through Clerk
   - Verify session is created

2. **Test Database Access**:
   - Make a query through Prisma
   - If RLS is enabled, verify users can only access their own data

3. **Check Supabase Dashboard**:
   - Go to Authentication > Users
   - Verify Clerk users appear (if webhooks are set up)

## Troubleshooting

### RLS Policies Not Working

- Ensure Clerk domain is correctly configured in Supabase
- Verify `auth.jwt()->>'sub'` matches your `clerkId` column
- Check that connection string uses Supabase's connection pool (not direct connection)
- Ensure Clerk session token includes `"role": "authenticated"`

### Connection Issues

- Verify `DATABASE_URL` uses Supabase's connection pool
- Check that `DIRECT_URL` is set for migrations
- Ensure SSL is enabled in connection strings

## References

- [Clerk Supabase Integration Docs](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Supabase Third-Party Auth](https://supabase.com/docs/guides/auth/third-party/overview)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
