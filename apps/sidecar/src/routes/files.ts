/**
 * File Operations Routes
 * Handles file-related operations for tasks
 */

import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { UnauthorizedError } from '../lib/errors'

export const fileRouter = Router()

/**
 * GET /api/files/list
 * List available files (placeholder for future implementation)
 */
fileRouter.get('/list', async (req, res, next) => {
  try {
    const { userId } = getAuth(req)

    if (!userId) {
      throw new UnauthorizedError()
    }

    // TODO: Implement file listing logic
    res.json({
      files: [],
      message: 'File operations endpoint - ready for implementation',
    })
  } catch (error) {
    next(error)
  }
})
