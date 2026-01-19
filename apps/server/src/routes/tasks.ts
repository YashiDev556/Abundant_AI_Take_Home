/**
 * Tasks Routes
 * Handles task CRUD operations and submissions
 */

import { Router } from 'express'
import { TaskService } from '../services/task.service'
import { attachUser, getUserFromRequest } from '../middleware/auth'
import { validateBody, validateParams } from '../middleware/validation'
import {
  createTaskSchema,
  updateTaskSchema,
  idParamSchema,
} from '../lib/schemas'
import { HTTP_STATUS } from '@repo/types'

export const tasksRouter = Router()

// Apply authentication to all routes
tasksRouter.use(attachUser)

/**
 * GET /api/tasks
 * Get all tasks for the current user
 * Query params:
 * - limit: number (optional) - limit the number of tasks returned
 */
tasksRouter.get('/', async (req, res, next) => {
  try {
    const user = getUserFromRequest(req)
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
    const tasks = await TaskService.getTasksByAuthor(user.id, limit)
    res.json({ tasks })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/tasks/:id
 * Get a specific task
 */
tasksRouter.get(
  '/:id',
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const user = getUserFromRequest(req)
      const { id } = req.params
      const task = await TaskService.getTaskById(id, user)
      res.json({ task })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/tasks
 * Create a new task in DRAFT state
 */
tasksRouter.post(
  '/',
  validateBody(createTaskSchema),
  async (req, res, next) => {
    try {
      const user = getUserFromRequest(req)
      const task = await TaskService.createTask(req.validatedBody as any, user.id, user)
      res.status(HTTP_STATUS.CREATED).json({ task })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * PUT /api/tasks/:id
 * Update a task (only if DRAFT or CHANGES_REQUESTED)
 */
tasksRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTaskSchema),
  async (req, res, next) => {
    try {
      const user = getUserFromRequest(req)
      const { id } = req.params
      const task = await TaskService.updateTask(id, req.validatedBody as any, user)
      res.json({ task })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/tasks/:id/submit
 * Submit a task for review
 */
tasksRouter.post(
  '/:id/submit',
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const user = getUserFromRequest(req)
      const { id } = req.params
      const task = await TaskService.submitTask(id, user)
      res.json({ task, message: 'Task submitted for review' })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/tasks/:id/duplicate
 * Duplicate a task (creates a copy in DRAFT state)
 */
tasksRouter.post(
  '/:id/duplicate',
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const user = getUserFromRequest(req)
      const { id } = req.params
      const task = await TaskService.duplicateTask(id, user)
      res.status(HTTP_STATUS.CREATED).json({ task, message: 'Task duplicated successfully' })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * DELETE /api/tasks/:id
 * Delete a task (only if DRAFT or REJECTED)
 */
tasksRouter.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const user = getUserFromRequest(req)
      const { id } = req.params
      await TaskService.deleteTask(id, user)
      res.status(HTTP_STATUS.NO_CONTENT).send()
    } catch (error) {
      next(error)
    }
  }
)
