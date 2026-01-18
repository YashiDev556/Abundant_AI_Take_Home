/**
 * Task Diff API Route
 * GET /api/audit/task/:taskId/diff - Get diff between two versions of a task
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, handleApiError } from '@/lib/api-auth'
import { TaskHistoryService } from '@repo/server/services/task-history.service'
import { BadRequestError } from '@/lib/api-errors'

/**
 * GET /api/audit/task/:taskId/diff
 * Get diff between two versions of a task
 * Query params: fromVersion, toVersion (required)
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
    
    const searchParams = request.nextUrl.searchParams
    const fromVersion = searchParams.get('fromVersion')
    const toVersion = searchParams.get('toVersion')

    if (!fromVersion || !toVersion) {
      throw new BadRequestError('Both fromVersion and toVersion are required')
    }

    const diff = await TaskHistoryService.getDiff(
      taskId,
      parseInt(fromVersion, 10),
      parseInt(toVersion, 10)
    )

    if (!diff) {
      throw new BadRequestError('One or both versions not found')
    }

    return NextResponse.json({ diff })
  } catch (error) {
    console.error('[GET /api/audit/task/:taskId/diff] Error:', error)
    return handleApiError(error)
  }
}
