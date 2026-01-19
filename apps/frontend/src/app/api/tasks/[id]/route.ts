/**
 * Task by ID API Routes
 * GET /api/tasks/[id] - Get a specific task
 * PUT /api/tasks/[id] - Update a task
 * DELETE /api/tasks/[id] - Delete a task
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, handleApiError } from '@/lib/api-auth'
import { HTTP_STATUS } from '@repo/types'
import { z } from 'zod'

import { TaskService } from '@repo/server/services/task.service'
import { updateTaskSchema, idParamSchema } from '@repo/server/lib/schemas'

/**
 * GET /api/tasks/[id]
 * Get a specific task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { id } = await params
    
    // Validate ID
    idParamSchema.parse({ id })
    
    const task = await TaskService.getTaskById(id, user)
    return NextResponse.json({ task })
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

/**
 * PUT /api/tasks/[id]
 * Update a task (only if DRAFT or CHANGES_REQUESTED)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { id } = await params
    const body = await request.json()
    
    // Validate ID and body
    idParamSchema.parse({ id })
    const validatedData = updateTaskSchema.parse(body)
    
    const task = await TaskService.updateTask(id, validatedData, user)
    return NextResponse.json({ task })
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

/**
 * DELETE /api/tasks/[id]
 * Delete a task (only if DRAFT or REJECTED)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { id } = await params
    
    // Validate ID
    idParamSchema.parse({ id })
    
    await TaskService.deleteTask(id, user)
    return new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT })
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
