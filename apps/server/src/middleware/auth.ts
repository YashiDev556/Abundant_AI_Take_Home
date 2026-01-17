/**
 * Authentication Middleware
 * Handles user extraction and role-based access control
 */

import { Request, Response, NextFunction } from 'express'
import { getAuth, clerkClient } from '@clerk/express'
import { prisma } from '@repo/db'
import { UserRole } from '@repo/types'
import { UnauthorizedError, ForbiddenError } from '../lib/errors'

/**
 * Extract and attach user to request
 * Automatically syncs user with database
 */
export async function attachUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuth(req)

    if (!userId) {
      throw new UnauthorizedError()
    }

    // Get user info from Clerk
    let clerkUser
    try {
      clerkUser = await clerkClient.users.getUser(userId)
    } catch (error) {
      console.warn('Failed to fetch user from Clerk:', error)
    }

    // Extract email and name from Clerk user
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || `${userId}@clerk.local`
    const name = clerkUser?.firstName && clerkUser?.lastName
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : clerkUser?.firstName || clerkUser?.lastName || clerkUser?.username || null

    // Sync user with database (upsert pattern)
    // First try to find existing user
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

    // Attach user to request
    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Require user to be authenticated
 * Must be used after attachUser middleware
 */
export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw new UnauthorizedError()
  }
  next()
}

/**
 * Require user to have reviewer role
 */
export function requireReviewer(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw new UnauthorizedError()
  }

  if (req.user.role !== UserRole.REVIEWER) {
    throw new ForbiddenError('Reviewer access required')
  }

  next()
}

/**
 * Get user from request (throws if not present)
 */
export function getUserFromRequest(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError()
  }
  return req.user
}
