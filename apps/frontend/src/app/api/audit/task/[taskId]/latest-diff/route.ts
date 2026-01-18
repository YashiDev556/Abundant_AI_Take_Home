/**
 * Latest Task Diff API Route
 * GET /api/audit/task/:taskId/latest-diff - Get diff between versions with content changes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, handleApiError } from '@/lib/api-auth'
import { TaskHistoryService } from '@repo/server/services/task-history.service'

/**
 * GET /api/audit/task/:taskId/latest-diff
 * Get diff between the most recent versions that have actual content changes
 * (useful for resubmissions after reviewer feedback)
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
    
    if (!taskId) {
      return NextResponse.json({ diff: null, message: 'Task ID is required' })
    }

    // Find versions with actual content changes
    const result = await TaskHistoryService.getLatestBeforeResubmission(taskId)

    if (!result) {
      // No content changes found - this means either:
      // 1. Task has never been edited after creation
      // 2. Only state changes occurred (submit, review) without content edits
      return NextResponse.json({ 
        diff: null, 
        message: 'No content changes found. The task may not have been edited after initial creation.' 
      })
    }

    const diff = await TaskHistoryService.getDiff(
      taskId,
      result.previous.version,
      result.current.version
    )

    if (!diff || diff.changes.length === 0) {
      return NextResponse.json({ 
        diff: null, 
        message: 'No differences found between versions' 
      })
    }

    return NextResponse.json({ diff })
  } catch (error) {
    console.error('[GET /api/audit/task/:taskId/latest-diff] Error:', error)
    return handleApiError(error)
  }
}
