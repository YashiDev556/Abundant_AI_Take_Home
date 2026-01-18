/**
 * Audit Entity Logs API Route
 * GET /api/audit/entity/:entityType/:entityId - Get audit logs for a specific entity
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, handleApiError } from '@/lib/api-auth'
import { AuditService } from '@repo/server/services/audit.service'

/**
 * GET /api/audit/entity/:entityType/:entityId
 * Get audit logs for a specific entity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> | { entityType: string; entityId: string } }
) {
  try {
    await getAuthenticatedUser()
    
    // Handle both Promise and direct params (Next.js 15+ vs 16)
    const resolvedParams = params instanceof Promise ? await params : params
    const { entityType, entityId } = resolvedParams

    const logs = await AuditService.getEntityLogs(entityType, entityId)
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('[GET /api/audit/entity/:entityType/:entityId] Error:', error)
    return handleApiError(error)
  }
}
