/**
 * Reviewer Routes
 * Handles review operations
 */

import { Router } from 'express'
import { TaskService } from '../services/task.service'
import { ReviewService } from '../services/review.service'
import { attachUser, requireReviewer, getUserFromRequest } from '../middleware/auth'
import { validateBody, validateParams } from '../middleware/validation'
import {
  submitReviewSchema,
  idParamSchema,
  type SubmitReviewInput,
} from '../lib/schemas'

export const reviewerRouter = Router()

// Apply authentication and reviewer check to all routes
reviewerRouter.use(attachUser, requireReviewer)

/**
 * GET /api/reviewer/tasks
 * Get all tasks awaiting review (SUBMITTED or IN_REVIEW)
 * Query params:
 * - limit: number (optional) - limit the number of tasks returned
 */
reviewerRouter.get('/tasks', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
    const tasks = await TaskService.getTasksForReview(limit)
    res.json({ tasks })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/reviewer/tasks/:id
 * Get a specific task for review
 */
reviewerRouter.get(
  '/tasks/:id',
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const task = await ReviewService.getTaskForReview(id)
      res.json({ task })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/reviewer/tasks/:id/start
 * Start reviewing a task (SUBMITTED → IN_REVIEW)
 */
reviewerRouter.post(
  '/tasks/:id/start',
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const reviewer = getUserFromRequest(req)
      const { id } = req.params
      const task = await ReviewService.startReview(id, reviewer.id)
      res.json({ task, message: 'Review started' })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/reviewer/tasks/:id/review
 * Submit review decision
 */
  reviewerRouter.post(
    '/tasks/:id/review',
    validateParams(idParamSchema),
    validateBody(submitReviewSchema),
    async (req, res, next) => {
      try {
        const reviewer = getUserFromRequest(req)
        const { id } = req.params
        const reviewData = req.validatedBody as SubmitReviewInput
        const { task, review } = await ReviewService.submitReview(
          id,
          reviewData,
          reviewer
        )
        res.json({
          task,
          review,
          message: `Task ${reviewData.decision.toLowerCase()}d`,
        })
      } catch (error) {
        next(error)
      }
    }
  )
