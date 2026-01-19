/**
 * Review Service
 * Business logic for review operations
 */

import { prisma, AuditAction } from '@repo/db'
import { User } from '@repo/db'
import {
  TaskState,
  Review,
  Task,
  ReviewDecision,
  isTaskReviewable,
  getStateFromDecision,
  isValidTaskTransition,
  TASK_INCLUDE_FULL,
} from '@repo/types'
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../lib/errors'
import type { SubmitReviewInput } from '../lib/schemas'
import { AuditService } from './audit.service'
import { TaskHistoryService } from './task-history.service'

export class ReviewService {
  /**
   * Start reviewing a task (SUBMITTED → IN_REVIEW)
   */
  static async startReview(taskId: string, reviewerId: string): Promise<Task> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask) {
      throw new NotFoundError('Task')
    }

    // Check if task is in SUBMITTED state
    if (existingTask.state !== TaskState.SUBMITTED) {
      throw new BadRequestError(
        `Task must be in SUBMITTED state to start review. Current state: ${existingTask.state}`
      )
    }

    // Transition to IN_REVIEW and assign reviewer
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        state: TaskState.IN_REVIEW,
        reviewerId,
      },
      include: TASK_INCLUDE_FULL,
    })

    // Create audit log
    await AuditService.log({
      action: AuditAction.REVIEW_STARTED,
      entityType: 'task',
      entityId: task.id,
      userId: reviewerId,
      metadata: {
        previousState: existingTask.state,
        currentState: TaskState.IN_REVIEW,
      },
    })

    return task as unknown as Task
  }

  /**
   * Submit review decision (or change a previous decision)
   */
  static async submitReview(
    taskId: string,
    data: SubmitReviewInput,
    reviewer: User
  ): Promise<{ task: Task; review: Review }> {
    const { decision, comment } = data

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask) {
      throw new NotFoundError('Task')
    }

    // Check if task is in reviewable state
    if (!isTaskReviewable(existingTask.state as TaskState)) {
      throw new BadRequestError(
        `Task is not in a reviewable state. Current state: ${existingTask.state}`
      )
    }

    // If task is IN_REVIEW, check if this reviewer is assigned
    if (existingTask.state === TaskState.IN_REVIEW && existingTask.reviewerId !== reviewer.id) {
      throw new ForbiddenError('This task is being reviewed by another reviewer')
    }

    // Get the new state from decision
    const newState = getStateFromDecision(decision as ReviewDecision)

    // Check if this is the same state (just adding new feedback, not changing decision)
    const isSameState = existingTask.state === newState

    // Validate transition (unless it's the same state - that's always allowed for adding feedback)
    if (!isSameState && !isValidTaskTransition(existingTask.state as TaskState, newState)) {
      throw new BadRequestError(
        `Invalid state transition from ${existingTask.state} to ${newState}`
      )
    }

    // Determine if this is a decision change (re-review) or just adding feedback
    const isDecisionChange = !isSameState && [TaskState.APPROVED, TaskState.REJECTED, TaskState.CHANGES_REQUESTED]
      .includes(existingTask.state as TaskState)

    // If starting review (SUBMITTED → IN_REVIEW), assign reviewer first
    if (existingTask.state === TaskState.SUBMITTED) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          state: TaskState.IN_REVIEW,
          reviewerId: reviewer.id,
        },
      })
    }

    // Create review record
    const review = await prisma.review.create({
      data: {
        taskId,
        reviewerId: reviewer.id,
        decision: decision as ReviewDecision,
        comment: comment || null,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Update task state (only if changed)
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        // Only update state if it changed
        ...(isSameState ? {} : { state: newState }),
        // Update reviewer assignment
        reviewerId: newState === TaskState.APPROVED ? null : existingTask.reviewerId || reviewer.id,
      },
      include: TASK_INCLUDE_FULL,
    })

    // Get the corresponding audit action
    const auditActionMap: Record<ReviewDecision, AuditAction> = {
      [ReviewDecision.APPROVE]: AuditAction.TASK_APPROVED,
      [ReviewDecision.REJECT]: AuditAction.TASK_REJECTED,
      [ReviewDecision.REQUEST_CHANGES]: AuditAction.TASK_CHANGES_REQUESTED,
    }

    // Create audit logs and history snapshot
    const auditLogs = [
      AuditService.log({
        action: AuditAction.REVIEW_SUBMITTED,
        entityType: 'review',
        entityId: review.id,
        userId: reviewer.id,
        userName: reviewer.name || undefined,
        userEmail: reviewer.email,
        metadata: {
          taskId,
          decision,
          hasComment: !!comment,
          isDecisionChange,
        },
      }),
      AuditService.log({
        action: auditActionMap[decision as ReviewDecision],
        entityType: 'task',
        entityId: taskId,
        userId: reviewer.id,
        userName: reviewer.name || undefined,
        userEmail: reviewer.email,
        metadata: {
          previousState: existingTask.state,
          currentState: newState,
          reviewId: review.id,
          isDecisionChange,
        },
      }),
      TaskHistoryService.createSnapshot({
        task: task as unknown as Task,
        changedBy: reviewer.id,
        changeType: isDecisionChange ? `decision_changed_to_${decision.toLowerCase()}` : `review_${decision.toLowerCase()}`,
      }),
    ]

    // Log decision change separately for clear audit trail
    if (isDecisionChange) {
      auditLogs.push(
        AuditService.log({
          action: AuditAction.REVIEW_DECISION_CHANGED,
          entityType: 'task',
          entityId: taskId,
          userId: reviewer.id,
          userName: reviewer.name || undefined,
          userEmail: reviewer.email,
          metadata: {
            previousDecision: existingTask.state,
            newDecision: newState,
            reviewId: review.id,
          },
        })
      )
    }

    await Promise.all(auditLogs)

    return {
      task: task as unknown as Task,
      review: review as unknown as Review,
    }
  }

  /**
   * Get a task for review (with validation)
   */
  static async getTaskForReview(taskId: string, reviewerId?: string): Promise<Task> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: TASK_INCLUDE_FULL,
    })

    if (!task) {
      throw new NotFoundError('Task')
    }

    // Check if task is reviewable OR if this reviewer has previously reviewed it
    const isReviewable = isTaskReviewable(task.state as TaskState)
    const hasReviewedIt = reviewerId && task.reviews?.some(
      (r: any) => r.reviewerId === reviewerId
    )
    const isAssignedReviewer = reviewerId && task.reviewerId === reviewerId
    const isCompletedState = [TaskState.APPROVED, TaskState.REJECTED, TaskState.CHANGES_REQUESTED]
      .includes(task.state as TaskState)
    
    // Allow access if:
    // 1. Task is in reviewable state (SUBMITTED or IN_REVIEW)
    // 2. Reviewer has previously reviewed this task
    // 3. Reviewer is assigned to this task (even if completed)
    if (!isReviewable && !hasReviewedIt && !(isAssignedReviewer && isCompletedState)) {
      throw new BadRequestError(
        `Task is not in a reviewable state and you haven't reviewed it. Current state: ${task.state}`
      )
    }

    return task as unknown as Task
  }
}
