/**
 * Reviewer Start Review API Route
 * POST /api/reviewer/tasks/[id]/start - Start reviewing a task
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireReviewer, handleApiError } from '@/lib/api-auth'
import { HTTP_STATUS } from '@repo/types'
import { z } from 'zod'

import { ReviewService } from '@repo/server/services/review.service'
import { idParamSchema } from '@repo/server/lib/schemas'

/**
 * POST /api/reviewer/tasks/[id]/start
 * Start reviewing a task (SUBMITTED → IN_REVIEW)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reviewer = await requireReviewer()
    const { id } = await params
    
    // Validate ID
    idParamSchema.parse({ id })
    
    const task = await ReviewService.startReview(id, reviewer.id)
    return NextResponse.json({ task, message: 'Review started' })
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
