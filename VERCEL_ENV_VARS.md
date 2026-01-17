# Vercel Environment Variables

## Required Variables for Vercel Deployment

### Database (Required for Prisma)
```env
DATABASE_URL="postgresql://postgres.USERNAME:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:PASSWORD@db.USERNAME.supabase.co:5432/postgres"
```
- **Used by**: Prisma client generation and database queries
- **Get from**: Supabase Dashboard > Project Settings > Database

### Clerk Authentication (Required)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**: Used by frontend (safe to expose)
- **CLERK_SECRET_KEY**: Used by server-side API routes (keep private)
- **Get from**: Clerk Dashboard > API Keys
- **⚠️ Important**: Use `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (not `CLERK_PUBLISHABLE_KEY`)

### Application URLs (Required)
```env
FRONTEND_URL=https://your-app.vercel.app
NEXT_PUBLIC_SERVER_URL=https://your-api-server.railway.app
NEXT_PUBLIC_SIDECAR_URL=https://your-sidecar-server.railway.app
```
- **FRONTEND_URL**: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
- **NEXT_PUBLIC_SERVER_URL**: Express API server URL (if deployed separately)
- **NEXT_PUBLIC_SIDECAR_URL**: Sidecar service URL (if deployed separately)

### Environment
```env
NODE_ENV=production
```

## Optional Variables

### Supabase (if using Supabase features)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
```

## Variables NOT in Root .env

The following variables are in your `.env.local` files but should also be in Vercel:

1. **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** - Your root `.env` has `CLERK_PUBLISHABLE_KEY` but the code uses `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

## Complete Vercel Environment Variables List

Copy these into Vercel (replace with your actual values):

```env
# Database
DATABASE_URL="your-supabase-pooled-connection-string"
DIRECT_URL="your-supabase-direct-connection-string"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# URLs
FRONTEND_URL="https://your-app.vercel.app"
NEXT_PUBLIC_SERVER_URL="https://your-api-server.railway.app"
NEXT_PUBLIC_SIDECAR_URL="https://your-sidecar-server.railway.app"

# Environment
NODE_ENV="production"

# Optional: Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-supabase-key"
```

## Important Notes

1. **Variable Name**: Make sure to use `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (with `NEXT_PUBLIC_` prefix) in Vercel, not `CLERK_PUBLISHABLE_KEY`

2. **Express Servers**: If deploying Express server and sidecar separately, they need:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `CLERK_SECRET_KEY`
   - `FRONTEND_URL` (pointing to your Vercel URL)

3. **Build Time**: Prisma needs `DATABASE_URL` and `DIRECT_URL` at build time to generate the client
