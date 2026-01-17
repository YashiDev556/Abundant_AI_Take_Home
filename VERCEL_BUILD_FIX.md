# Vercel Build Fix

## Issue
The build was failing because Prisma requires `DATABASE_URL` and `DIRECT_URL` environment variables, even though they're not needed for generating the Prisma client (only for actual database connections).

## Solution
Updated the build script in `packages/db/package.json` to provide fallback dummy values for `DATABASE_URL` and `DIRECT_URL` during the build process:

```json
"build": "DATABASE_URL=${DATABASE_URL:-postgresql://dummy:dummy@localhost:5432/dummy} DIRECT_URL=${DIRECT_URL:-postgresql://dummy:dummy@localhost:5432/dummy} prisma generate"
```

This ensures that:
1. If `DATABASE_URL` and `DIRECT_URL` are set (like in Vercel), they're used
2. If they're not set (like during local builds without env vars), dummy values are used
3. Prisma generate succeeds in both cases (it doesn't actually connect to the database)

## Important Notes

**You still need to set `DATABASE_URL` and `DIRECT_URL` in Vercel** for runtime! The build fix only allows the build to succeed. At runtime, your application needs the real database connection strings.

## Required Vercel Environment Variables

Make sure these are set in Vercel (see `VERCEL_ENV_VARS.md` for the complete list):

- `DATABASE_URL` - Required for runtime database connections
- `DIRECT_URL` - Required for Prisma migrations
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Required for Clerk authentication
- `CLERK_SECRET_KEY` - Required for server-side Clerk operations
- `FRONTEND_URL` - Your Vercel deployment URL
- `NEXT_PUBLIC_SERVER_URL` - Your API server URL
- `NEXT_PUBLIC_SIDECAR_URL` - Your sidecar service URL
- `NODE_ENV=production`

The build will now succeed even if some of these are missing, but the application won't work correctly at runtime without them.
