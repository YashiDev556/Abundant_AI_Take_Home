/**
 * Auth Me API Route
 * GET /api/auth/me - Get current user
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser, handleApiError } from '@/lib/api-auth'

/**
 * GET /api/auth/me
 * Get current user (syncs with database if needed)
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error in /api/auth/me:', error)
    return handleApiError(error)
  }
}
