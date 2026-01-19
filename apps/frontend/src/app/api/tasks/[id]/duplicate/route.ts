/**
 * Task Duplicate API Route
 * POST /api/tasks/:id/duplicate - Duplicate a task
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, handleApiError } from '@/lib/api-auth'
import { HTTP_STATUS } from '@repo/types'
import { TaskService } from '@repo/server/services/task.service'

/**
 * POST /api/tasks/:id/duplicate
 * Duplicate a task (creates a copy in DRAFT state)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { id } = await params

    const task = await TaskService.duplicateTask(id, user)
    return NextResponse.json(
      { task, message: 'Task duplicated successfully' },
      { status: HTTP_STATUS.CREATED }
    )
  } catch (error) {
    console.error('[POST /api/tasks/:id/duplicate] Error:', error)
    return handleApiError(error)
  }
}
