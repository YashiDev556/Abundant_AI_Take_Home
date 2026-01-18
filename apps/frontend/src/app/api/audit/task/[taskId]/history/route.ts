/**
 * Task History API Route
 * GET /api/audit/task/:taskId/history - Get full history of a task
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, handleApiError } from '@/lib/api-auth'
import { TaskHistoryService } from '@repo/server/services/task-history.service'

/**
 * GET /api/audit/task/:taskId/history
 * Get full history of a task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  try {
    await getAuthenticatedUser()
    
    // Handle both Promise and direct params (Next.js 15+ vs 16)
    const resolvedParams = params instanceof Promise ? await params : params
    const { taskId } = resolvedParams

    const history = await TaskHistoryService.getTaskHistory(taskId)
    return NextResponse.json({ history })
  } catch (error) {
    console.error('[GET /api/audit/task/:taskId/history] Error:', error)
    return handleApiError(error)
  }
}
