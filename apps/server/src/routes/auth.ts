/**
 * Auth Routes
 * Handles authentication and user operations
 */

import { Router } from 'express'
import { attachUser, getUserFromRequest } from '../middleware/auth'

export const authRouter = Router()

/**
 * GET /api/auth/me
 * Get current user (syncs with database if needed)
 */
authRouter.get('/me', attachUser, async (req, res, next) => {
  try {
    const user = getUserFromRequest(req)
    res.json({ user })
  } catch (error) {
    next(error)
  }
})
