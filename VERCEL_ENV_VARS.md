# Vercel Environment Variables Setup

This document lists all required environment variables that must be set in your Vercel project for the application to work correctly.

## Required Environment Variables

### 1. Database Configuration

These are **CRITICAL** - the app will not work without them.

```bash
DATABASE_URL=postgresql://postgres.USERNAME:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres:PASSWORD@db.USERNAME.supabase.co:5432/postgres
```

**Where to get them:**
- Go to your Supabase Dashboard
- Navigate to **Project Settings > Database**
- Copy the **Connection Pooling** URL (port 6543) for `DATABASE_URL`
- Copy the **Direct Connection** URL (port 5432) for `DIRECT_URL`

**Important:** Make sure to URL-encode special characters in passwords (e.g., `&` becomes `%26`, `!` becomes `%21`)

### 2. Clerk Authentication

These are **CRITICAL** - authentication will not work without them.

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to get them:**
- Go to your Clerk Dashboard
- Navigate to **API Keys**
- Copy the **Publishable Key** for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Copy the **Secret Key** for `CLERK_SECRET_KEY`

**Note:** The `NEXT_PUBLIC_` prefix is important - it makes the key available in the browser.

### 3. Application URLs (Optional but Recommended)

```bash
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

**Note:** `FRONTEND_URL` should match your Vercel deployment URL. This is used for CORS and redirects.

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings > Environment Variables**
3. Add each variable:
   - **Name**: The variable name (e.g., `DATABASE_URL`)
   - **Value**: The variable value
   - **Environment**: Select which environments to apply to:
     - ✅ **Production** (required)
     - ✅ **Preview** (recommended)
     - ✅ **Development** (optional, for local testing)

4. Click **Save**
5. **Redeploy** your application for changes to take effect

## Verification

After setting the environment variables and redeploying:

1. Check the Vercel deployment logs for any errors
2. Try accessing your API routes (e.g., `/api/tasks`)
3. Check the browser console for any error messages
4. Verify that you can:
   - Sign in with Clerk
   - Fetch tasks
   - Create new tasks

## Troubleshooting

### "Failed to fetch" errors

If you're getting "Failed to fetch" errors:

1. **Check environment variables are set:**
   - Go to Vercel Dashboard > Settings > Environment Variables
   - Verify all required variables are present
   - Make sure they're set for **Production** environment

2. **Check API route logs:**
   - Go to Vercel Dashboard > Your Project > Deployments
   - Click on the latest deployment
   - Check the **Functions** tab for API route logs
   - Look for errors related to:
     - Database connection (`Can't reach database server`)
     - Clerk authentication (`Missing publishableKey`)
     - Missing environment variables

3. **Verify database connection:**
   - Check that `DATABASE_URL` is correct
   - Ensure the Supabase database is accessible
   - Verify the connection string format is correct

4. **Check Clerk configuration:**
   - Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set
   - Verify `CLERK_SECRET_KEY` is set
   - Check Clerk Dashboard > Applications > Your App > Settings
   - Ensure the Vercel URL is added to **Allowed Origins**

### Database Connection Errors

If you see errors like `Can't reach database server at localhost:5432`:

- This means `DATABASE_URL` is not set or is incorrect
- Make sure you're using the **Connection Pooling** URL (port 6543) for `DATABASE_URL`
- The URL should include `?pgbouncer=true` parameter (or it will be added automatically)

### Authentication Errors

If authentication is not working:

- Verify `CLERK_SECRET_KEY` is set in Vercel
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in Vercel
- Check Clerk Dashboard for any errors
- Ensure your Vercel deployment URL is added to Clerk's allowed origins

## Quick Checklist

Before deploying, make sure you have:

- [ ] `DATABASE_URL` set (Supabase Connection Pooling URL)
- [ ] `DIRECT_URL` set (Supabase Direct Connection URL)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set
- [ ] `CLERK_SECRET_KEY` set
- [ ] All variables are set for **Production** environment
- [ ] Redeployed after setting variables

## Example Environment Variables

Here's an example of what your Vercel environment variables should look like:

```
DATABASE_URL=postgresql://postgres.abcdefgh:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres:PASSWORD@db.abcdefgh.supabase.co:5432/postgres
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

**Remember:** Never commit these values to Git! They should only be set in Vercel's environment variables.
