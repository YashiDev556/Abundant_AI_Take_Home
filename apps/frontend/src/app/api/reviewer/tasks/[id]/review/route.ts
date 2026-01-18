/**
 * Reviewer Submit Review API Route
 * POST /api/reviewer/tasks/[id]/review - Submit review decision
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireReviewer, handleApiError } from '@/lib/api-auth'
import { HTTP_STATUS } from '@repo/types'
import { z } from 'zod'

import { ReviewService } from '@repo/server/services/review.service'
import { submitReviewSchema, idParamSchema } from '@repo/server/lib/schemas'

/**
 * POST /api/reviewer/tasks/[id]/review
 * Submit review decision
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reviewer = await requireReviewer()
    const { id } = await params
    const body = await request.json()
    
    // Validate ID and body
    idParamSchema.parse({ id })
    const reviewData = submitReviewSchema.parse(body)
    
    const { task, review } = await ReviewService.submitReview(
      id,
      reviewData,
      reviewer
    )
    
    return NextResponse.json({
      task,
      review,
      message: `Task ${reviewData.decision.toLowerCase()}d`,
    })
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
