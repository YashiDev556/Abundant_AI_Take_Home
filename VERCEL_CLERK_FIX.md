# Vercel Clerk Publishable Key Error Fix

## Error
```
Error: @clerk/clerk-react: Missing publishableKey
```

## Cause
The `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` environment variable is not set in your Vercel project settings.

## Solution

### Option 1: Set Environment Variable in Vercel (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the following variable:
   - **Name**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Value**: Your Clerk publishable key (starts with `pk_test_` or `pk_live_`)
   - **Environments**: Select all (Production, Preview, Development)
4. Click **Save**
5. Redeploy your application

### Option 2: Temporary Build Fix (Not Recommended for Production)

The code has been updated to use a dummy key during build if the environment variable is missing. However, **this will cause authentication to fail at runtime**. You MUST set the environment variable in Vercel for the application to work.

## How to Get Your Clerk Publishable Key

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **API Keys** in the sidebar
4. Copy the **Publishable key** (it starts with `pk_test_` for development or `pk_live_` for production)

## Important Notes

- `NEXT_PUBLIC_` prefix means this variable is exposed to the browser (safe for publishable keys)
- The publishable key is safe to expose - it's designed to be public
- You still need to keep `CLERK_SECRET_KEY` private (server-side only)
- After setting the variable, you must redeploy for changes to take effect

## Verification

After setting the environment variable and redeploying:
1. The build should complete successfully
2. Authentication should work correctly
3. Users should be able to sign in/sign up
