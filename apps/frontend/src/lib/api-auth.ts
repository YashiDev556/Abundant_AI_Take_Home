/**
 * Authentication utilities for Next.js API routes
 * Adapts Express middleware to Next.js route handlers
 */

// Load environment variables for API routes
// Next.js automatically loads .env.local and .env, but we ensure DATABASE_URL is available
if (typeof process !== 'undefined' && process.env) {
  // Log DATABASE_URL status (without exposing the actual URL)
  if (!process.env.DATABASE_URL) {
    console.warn('[api-auth] DATABASE_URL is not set in environment variables')
  } else {
    const dbUrl = process.env.DATABASE_URL
    const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
    if (isLocalhost && !dbUrl.includes('supabase')) {
      console.warn('[api-auth] DATABASE_URL appears to point to localhost, not Supabase')
    }
  }
}

import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@repo/db'
import { UserRole } from '@repo/types'
import type { User } from '@repo/db'
import { UnauthorizedError, ForbiddenError } from './api-errors'

/**
 * Get authenticated user from Clerk and sync with database
 * Returns the user or throws UnauthorizedError
 */
export async function getAuthenticatedUser(): Promise<User> {
  const authResult = await auth()
  const userId = authResult.userId

  if (!userId) {
    throw new UnauthorizedError()
  }

  // Get user info from Clerk
  let clerkUser
  try {
    clerkUser = await currentUser()
  } catch (error) {
    console.warn('Failed to fetch user from Clerk:', error)
  }

  // Extract email and name from Clerk user
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress || `${userId}@clerk.local`
  const name = clerkUser?.firstName && clerkUser?.lastName
    ? `${clerkUser.firstName} ${clerkUser.lastName}`
    : clerkUser?.firstName || clerkUser?.lastName || clerkUser?.username || null

  // Sync user with database (upsert pattern)
  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (user) {
    // Update user if email or name changed
    if (user.email !== email || user.name !== name) {
      user = await prisma.user.update({
        where: { clerkId: userId },
        data: {
          email,
          name,
        },
      })
    }
  } else {
    // Create new user
    try {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email,
          name,
        },
      })
    } catch (error: any) {
      // If unique constraint fails on email, try to find by email and update
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        })
        if (existingUser) {
          // Update existing user with new clerkId
          user = await prisma.user.update({
            where: { email },
            data: {
              clerkId: userId,
              name: name || existingUser.name,
            },
          })
        } else {
          throw error
        }
      } else {
        throw error
      }
    }
  }

  return user
}

/**
 * Require user to have reviewer role
 * Throws ForbiddenError if user is not a reviewer
 */
export async function requireReviewer(): Promise<User> {
  const user = await getAuthenticatedUser()

  if (user.role !== UserRole.REVIEWER) {
    throw new ForbiddenError('Reviewer access required')
  }

  return user
}

/**
 * Handle API errors and return appropriate Next.js response
 */
export function handleApiError(error: unknown): NextResponse {
  // Log full error details for debugging
  console.error('API Error:', error)
  if (error instanceof Error) {
    console.error('Error stack:', error.stack)
    console.error('Error message:', error.message)
    
    // Check for database connection errors
    if (error.message.includes("Can't reach database server") || 
        error.message.includes("P1001") ||
        error.message.includes("localhost:5432")) {
      console.error('Database connection error detected. Check DATABASE_URL environment variable.')
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: process.env.NODE_ENV === 'development' 
            ? error.message 
            : 'Please check server configuration'
        },
        { status: 500 }
      )
    }
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    )
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    )
  }

  if (error instanceof Error && 'statusCode' in error) {
    const apiError = error as { statusCode: number; message: string }
    return NextResponse.json(
      { error: apiError.message },
      { status: apiError.statusCode }
    )
  }

  // Unknown error - return more details in development
  let errorMessage = 'Internal server error'
  
  if (error instanceof Error) {
    errorMessage = error.message || errorMessage
  } else if (typeof error === 'string') {
    errorMessage = error
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as { message: unknown }).message) || errorMessage
  }
  
  const debugInfo: Record<string, any> = {}
  
  if (process.env.NODE_ENV === 'development') {
    if (error instanceof Error) {
      debugInfo.stack = error.stack
      debugInfo.name = error.name
    }
    if (error && typeof error === 'object') {
      debugInfo.rawError = String(error)
    }
  }
  
  return NextResponse.json(
    { 
      error: errorMessage,
      ...debugInfo,
    },
    { status: 500 }
  )
}
