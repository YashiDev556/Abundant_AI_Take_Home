# Vercel Deployment Guide

## The Issue

Vercel is trying to run `cd apps/frontend` but getting "No such file or directory". This happens because Vercel needs to know where your Next.js app is located in the monorepo.

## Solution: Set Root Directory in Vercel Dashboard

The easiest way to deploy a monorepo to Vercel is to set the **Root Directory** in your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **General**
3. Scroll down to **Root Directory**
4. Set it to: `apps/frontend`
5. Click **Save**

After setting the root directory, Vercel will:
- Automatically detect it as a Next.js app
- Run `npm install` and `npm run build` from the `apps/frontend` directory
- Use the correct output directory (`.next`)

## Alternative: Keep vercel.json at Root

If you prefer to keep the `vercel.json` at the root, you can use Turbo:

```json
{
  "buildCommand": "npm install && npx turbo run build --filter=@repo/frontend",
  "outputDirectory": "apps/frontend/.next",
  "installCommand": "npm install"
}
```

However, **the Root Directory approach is recommended** as it's simpler and Vercel handles everything automatically.

## After Setting Root Directory

Once you set the root directory to `apps/frontend`, you can:

1. **Remove or simplify vercel.json** - Vercel will auto-detect Next.js
2. **Set environment variables** - Use the list from `VERCEL_ENV_VARS.md`
3. **Deploy** - Vercel will build from `apps/frontend` automatically

## Environment Variables

Make sure to set all required environment variables in Vercel (see `VERCEL_ENV_VARS.md`):
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `FRONTEND_URL` (your Vercel URL)
- `NEXT_PUBLIC_SERVER_URL` (your API server URL)
- `NEXT_PUBLIC_SIDECAR_URL` (your sidecar URL)
- `NODE_ENV=production`

## Troubleshooting

If you still get "No such file or directory" errors:

1. **Check Root Directory**: Make sure it's set to `apps/frontend` (not `app/frontend` or `frontend`)
2. **Check Git**: Ensure `apps/frontend` is committed to your repository
3. **Check Build Logs**: Look at the Vercel build logs to see what directory it's running from
