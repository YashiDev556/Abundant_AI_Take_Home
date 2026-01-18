/**
 * Tasks API Routes
 * GET /api/tasks - Get all tasks for current user
 * POST /api/tasks - Create a new task
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, handleApiError } from '@/lib/api-auth'
import { HTTP_STATUS } from '@repo/types'
import { z } from 'zod'

// Import services and schemas from server package
import { TaskService } from '@repo/server/services/task.service'
import { createTaskSchema } from '@repo/server/lib/schemas'

/**
 * GET /api/tasks
 * Get all tasks for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Check for required environment variables early
    if (!process.env.DATABASE_URL) {
      console.error('[GET /api/tasks] DATABASE_URL is not set')
      return NextResponse.json(
        { error: 'Server configuration error: Database connection not configured' },
        { status: 500 }
      )
    }
    
    const user = await getAuthenticatedUser()
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined
    
    const tasks = await TaskService.getTasksByAuthor(user.id, limit)
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('[GET /api/tasks] Error:', error)
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('[GET /api/tasks] Error name:', error.name)
      console.error('[GET /api/tasks] Error message:', error.message)
      if (error.stack) {
        console.error('[GET /api/tasks] Error stack:', error.stack)
      }
    }
    return handleApiError(error)
  }
}

/**
 * POST /api/tasks
 * Create a new task in DRAFT state
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()
    
    // Validate request body
    const validatedData = createTaskSchema.parse(body)
    
    const task = await TaskService.createTask(validatedData, user.id, user)
    return NextResponse.json({ task }, { status: HTTP_STATUS.CREATED })
  } catch (error) {
    console.error('[POST /api/tasks] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    return handleApiError(error)
  }
}
