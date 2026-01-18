/**
 * Reviewer Tasks API Route
 * GET /api/reviewer/tasks - Get tasks for reviewer
 * Query params:
 *   - filter: 'pending' | 'history' | 'all' (default: 'all')
 *   - limit: number (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireReviewer, handleApiError } from '@/lib/api-auth'

import { TaskService } from '@repo/server/services/task.service'

/**
 * GET /api/reviewer/tasks
 * Get tasks for reviewer with optional filter
 * - pending: SUBMITTED, IN_REVIEW (tasks awaiting review)
 * - history: APPROVED, REJECTED, CHANGES_REQUESTED (tasks this reviewer has reviewed)
 * - all: all of the above
 */
export async function GET(request: NextRequest) {
  try {
    const reviewer = await requireReviewer()
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined
    const filter = (searchParams.get('filter') || 'all') as 'pending' | 'history' | 'all'
    
    const tasks = await TaskService.getReviewerTasks(reviewer.id, filter, limit)
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('[GET /api/reviewer/tasks] Error:', error)
    return handleApiError(error)
  }
}
