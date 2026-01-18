/**
 * Task Submit API Route
 * POST /api/tasks/[id]/submit - Submit a task for review
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, handleApiError } from '@/lib/api-auth'
import { z } from 'zod'
import { HTTP_STATUS } from '@repo/types'

import { TaskService } from '@repo/server/services/task.service'
import { idParamSchema } from '@repo/server/lib/schemas'

/**
 * POST /api/tasks/[id]/submit
 * Submit a task for review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { id } = await params
    
    // Validate ID
    idParamSchema.parse({ id })
    
    const task = await TaskService.submitTask(id, user)
    return NextResponse.json({ task, message: 'Task submitted for review' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    return handleApiError(error)
  }
}
