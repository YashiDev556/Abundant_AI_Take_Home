/**
 * Health Check API Route
 * GET /api/health - Check if API routes are working and environment variables are set
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    checks: {
      databaseUrl: !!process.env.DATABASE_URL,
      directUrl: !!process.env.DIRECT_URL,
      clerkPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      clerkSecretKey: !!process.env.CLERK_SECRET_KEY,
    },
    nodeEnv: process.env.NODE_ENV || 'unknown',
  }

  // Check if all required env vars are set
  const allSet = 
    checks.checks.databaseUrl &&
    checks.checks.directUrl &&
    checks.checks.clerkPublishableKey &&
    checks.checks.clerkSecretKey

  if (!allSet) {
    checks.status = 'degraded'
  }

  return NextResponse.json(checks, {
    status: allSet ? 200 : 503,
  })
}
