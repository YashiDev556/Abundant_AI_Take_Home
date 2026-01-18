/**
 * Reviewer Task by ID API Routes
 * GET /api/reviewer/tasks/[id] - Get a specific task for review
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireReviewer, handleApiError } from '@/lib/api-auth'
import { HTTP_STATUS } from '@repo/types'
import { z } from 'zod'

import { ReviewService } from '@repo/server/services/review.service'
import { idParamSchema } from '@repo/server/lib/schemas'

/**
 * GET /api/reviewer/tasks/[id]
 * Get a specific task for review (or view previously reviewed task)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const reviewer = await requireReviewer()
    
    // Handle both Promise and direct params (Next.js 15+ vs 16)
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    
    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    
    // Validate ID
    idParamSchema.parse({ id })
    
    // Pass reviewer ID to allow viewing previously reviewed tasks
    const task = await ReviewService.getTaskForReview(id, reviewer.id)
    return NextResponse.json({ task })
  } catch (error) {
    console.error('[GET /api/reviewer/tasks/:id] Error:', error)
    if (error instanceof z.ZodError) {
      console.error('[GET /api/reviewer/tasks/:id] Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    return handleApiError(error)
  }
}
