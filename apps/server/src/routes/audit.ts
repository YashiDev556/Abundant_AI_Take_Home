/**
 * Audit Log Routes
 * Provides access to system audit logs for compliance and transparency
 */

import { Router } from 'express'
import { attachUser } from '../middleware/auth'
import { AuditService } from '../services/audit.service'
import { TaskHistoryService } from '../services/task-history.service'
import { BadRequestError } from '../lib/errors'

const router = Router()

// Apply authentication to all routes
router.use(attachUser)

/**
 * GET /audit/logs
 * Get audit logs (admin/reviewer access)
 */
router.get('/logs', async (req, res, next) => {
  try {
    const { entityType, entityId, userId, action, limit, offset } = req.query

    const result = await AuditService.getLogs({
      entityType: entityType as string | undefined,
      entityId: entityId as string | undefined,
      userId: userId as string | undefined,
      action: action as any,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /audit/entity/:entityType/:entityId
 * Get audit logs for a specific entity
 */
router.get('/entity/:entityType/:entityId', async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params
    const logs = await AuditService.getEntityLogs(entityType, entityId)
    res.json({ logs })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /audit/task/:taskId/history
 * Get full history of a task
 */
router.get('/task/:taskId/history', async (req, res, next) => {
  try {
    const { taskId } = req.params
    const history = await TaskHistoryService.getTaskHistory(taskId)
    res.json({ history })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /audit/task/:taskId/diff
 * Get diff between two versions of a task
 */
router.get('/task/:taskId/diff', async (req, res, next) => {
  try {
    const { taskId } = req.params
    const { fromVersion, toVersion } = req.query

    if (!fromVersion || !toVersion) {
      throw new BadRequestError('Both fromVersion and toVersion are required')
    }

    const diff = await TaskHistoryService.getDiff(
      taskId,
      parseInt(fromVersion as string, 10),
      parseInt(toVersion as string, 10)
    )

    if (!diff) {
      throw new BadRequestError('One or both versions not found')
    }

    res.json({ diff })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /audit/task/:taskId/latest-diff
 * Get diff between the last two versions (useful for resubmissions)
 */
router.get('/task/:taskId/latest-diff', async (req, res, next) => {
  try {
    const { taskId } = req.params
    const result = await TaskHistoryService.getLatestBeforeResubmission(taskId)

    if (!result) {
      return res.json({ diff: null, message: 'No previous version found' })
    }

    const diff = await TaskHistoryService.getDiff(
      taskId,
      result.previous.version,
      result.current.version
    )

    res.json({ diff })
  } catch (error) {
    next(error)
  }
})

export default router
