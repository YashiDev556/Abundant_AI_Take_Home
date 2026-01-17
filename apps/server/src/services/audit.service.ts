/**
 * Audit Log Service
 * Handles creation and retrieval of audit logs for compliance and transparency
 */

import { prisma } from '@repo/db'
import { AuditAction } from '@repo/types'

interface CreateAuditLogParams {
  action: AuditAction
  entityType: string
  entityId: string
  userId: string
  userName?: string
  userEmail?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

interface GetAuditLogsParams {
  entityType?: string
  entityId?: string
  userId?: string
  action?: AuditAction
  limit?: number
  offset?: number
}

export class AuditService {
  /**
   * Create a new audit log entry
   */
  static async log(params: CreateAuditLogParams) {
    return await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        metadata: params.metadata || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  }

  /**
   * Get audit logs with optional filtering
   */
  static async getLogs(params: GetAuditLogsParams = {}) {
    const {
      entityType,
      entityId,
      userId,
      action,
      limit = 50,
      offset = 0,
    } = params

    const where: any = {}
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (userId) where.userId = userId
    if (action) where.action = action

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      logs,
      total,
      limit,
      offset,
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityLogs(entityType: string, entityId: string) {
    return await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserLogs(userId: string, limit = 50) {
    return await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}
