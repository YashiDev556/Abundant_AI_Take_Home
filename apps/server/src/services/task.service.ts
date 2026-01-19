/**
 * Task Service
 * Business logic for task operations
 */

import { prisma, AuditAction } from '@repo/db'
import { User } from '@repo/db'
import {
  TaskState,
  Task,
  canEditTask,
  canSubmitTask,
  TASK_INCLUDE_FULL,
  TASK_SELECT_LIST,
  ERROR_MESSAGES,
} from '@repo/types'
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../lib/errors'
import type { CreateTaskInput, UpdateTaskInput } from '../lib/schemas'
import { AuditService } from './audit.service'
import { TaskHistoryService } from './task-history.service'

export class TaskService {
  /**
   * Get all tasks for a specific author (lightweight - no reviews)
   * Optimized: Only fetches essential fields, excludes heavy text content
   */
  static async getTasksByAuthor(authorId: string, limit?: number): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      select: {
        ...TASK_SELECT_LIST,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // Don't include reviews for list view
      },
      ...(limit && { take: limit }),
    })

    return tasks as unknown as Task[]
  }

  /**
   * Get a task by ID
   */
  static async getTaskById(taskId: string, user: User): Promise<Task> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: TASK_INCLUDE_FULL,
    })

    if (!task) {
      throw new NotFoundError('Task')
    }

    // Check if user has access (author or reviewer)
    if (task.authorId !== user.id && user.role !== 'REVIEWER') {
      throw new ForbiddenError()
    }

    return task as unknown as Task
  }

  /**
   * Create a new task in DRAFT state
   */
  static async createTask(
    data: CreateTaskInput,
    authorId: string,
    user: User
  ): Promise<Task> {
    const task = await prisma.task.create({
      data: {
        ...data,
        state: TaskState.DRAFT,
        authorId,
      },
      include: TASK_INCLUDE_FULL,
    })

    // Create audit log and history snapshot
    await Promise.all([
      AuditService.log({
        action: AuditAction.TASK_CREATED,
        entityType: 'task',
        entityId: task.id,
        userId: user.id,
        userName: user.name || undefined,
        userEmail: user.email,
        metadata: { title: task.title, state: task.state },
      }),
      TaskHistoryService.createSnapshot({
        task: task as unknown as Task,
        changedBy: user.id,
        changeType: 'created',
      }),
    ])

    return task as unknown as Task
  }

  /**
   * Update a task (only if editable)
   */
  static async updateTask(
    taskId: string,
    data: UpdateTaskInput,
    user: User
  ): Promise<Task> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask) {
      throw new NotFoundError('Task')
    }

    // Check if user is the author
    if (existingTask.authorId !== user.id) {
      throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_AUTHOR_ONLY)
    }

    // Check if task can be edited
    if (!canEditTask(existingTask.state as TaskState)) {
      throw new BadRequestError(
        `Task cannot be edited in ${existingTask.state} state. Only DRAFT and CHANGES_REQUESTED tasks can be edited.`
      )
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: TASK_INCLUDE_FULL,
    })

    // Create audit log and history snapshot
    await Promise.all([
      AuditService.log({
        action: AuditAction.TASK_UPDATED,
        entityType: 'task',
        entityId: task.id,
        userId: user.id,
        userName: user.name || undefined,
        userEmail: user.email,
        metadata: {
          updates: Object.keys(data),
          previousState: existingTask.state,
          currentState: task.state,
        },
      }),
      TaskHistoryService.createSnapshot({
        task: task as unknown as Task,
        changedBy: user.id,
        changeType: 'updated',
      }),
    ])

    return task as unknown as Task
  }

  /**
   * Submit a task for review
   */
  static async submitTask(taskId: string, user: User): Promise<Task> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask) {
      throw new NotFoundError('Task')
    }

    // Check if user is the author
    if (existingTask.authorId !== user.id) {
      throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_AUTHOR_ONLY)
    }

    // Check if task can be submitted
    if (!canSubmitTask(existingTask.state as TaskState)) {
      throw new BadRequestError(
        `Task cannot be submitted from ${existingTask.state} state. Only DRAFT, REJECTED, and CHANGES_REQUESTED tasks can be submitted.`
      )
    }

    // Validate required fields
    if (!existingTask.title || !existingTask.instruction) {
      throw new BadRequestError(ERROR_MESSAGES.REQUIRED_FIELDS_MISSING)
    }

    // Transition to SUBMITTED state
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        state: TaskState.SUBMITTED,
        reviewerId: null, // Clear any previous reviewer
      },
      include: TASK_INCLUDE_FULL,
    })

    // Create audit log and history snapshot
    await Promise.all([
      AuditService.log({
        action: AuditAction.TASK_SUBMITTED,
        entityType: 'task',
        entityId: task.id,
        userId: user.id,
        userName: user.name || undefined,
        userEmail: user.email,
        metadata: {
          previousState: existingTask.state,
          currentState: TaskState.SUBMITTED,
        },
      }),
      TaskHistoryService.createSnapshot({
        task: task as unknown as Task,
        changedBy: user.id,
        changeType: 'submitted',
      }),
    ])

    return task as unknown as Task
  }

  /**
   * Get tasks awaiting review (SUBMITTED or IN_REVIEW)
   * Optimized: Only fetches essential fields
   */
  static async getTasksForReview(limit?: number): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
      where: {
        state: {
          in: [TaskState.SUBMITTED, TaskState.IN_REVIEW],
        },
      },
      orderBy: { createdAt: 'asc' }, // Oldest first
      select: {
        ...TASK_SELECT_LIST,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      ...(limit && { take: limit }),
    })

    return tasks as unknown as Task[]
  }

  /**
   * Get tasks that a reviewer has reviewed (APPROVED, REJECTED, CHANGES_REQUESTED)
   * Shows tasks where the reviewer has submitted a review
   * Optimized: Only fetches essential fields
   */
  static async getReviewerHistory(reviewerId: string, limit?: number): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          // Tasks where this reviewer is assigned
          { reviewerId },
          // Tasks where this reviewer has submitted a review
          {
            reviews: {
              some: {
                reviewerId,
              },
            },
          },
        ],
        state: {
          in: [TaskState.APPROVED, TaskState.REJECTED, TaskState.CHANGES_REQUESTED],
        },
      },
      orderBy: { updatedAt: 'desc' }, // Most recently reviewed first
      select: {
        ...TASK_SELECT_LIST,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      ...(limit && { take: limit }),
    })

    return tasks as unknown as Task[]
  }

  /**
   * Delete a task (only if DRAFT or REJECTED)
   */
  static async deleteTask(taskId: string, user: User): Promise<void> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask) {
      throw new NotFoundError('Task')
    }

    // Check if user is the author
    if (existingTask.authorId !== user.id) {
      throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_AUTHOR_ONLY)
    }

    // Only allow deletion of DRAFT or REJECTED tasks
    if (existingTask.state !== TaskState.DRAFT && existingTask.state !== TaskState.REJECTED) {
      throw new BadRequestError(
        `Task cannot be deleted in ${existingTask.state} state. Only DRAFT and REJECTED tasks can be deleted.`
      )
    }

    // Delete the task (cascade will handle related records)
    await prisma.task.delete({
      where: { id: taskId },
    })

    // Create audit log
    await AuditService.log({
      action: AuditAction.TASK_DELETED,
      entityType: 'task',
      entityId: taskId,
      userId: user.id,
      userName: user.name || undefined,
      userEmail: user.email,
      metadata: {
        title: existingTask.title,
        state: existingTask.state,
      },
    })
  }

  /**
   * Get all tasks visible to a reviewer (both pending and history)
   * filter: 'pending' | 'history' | 'all'
   */
  static async getReviewerTasks(
    reviewerId: string, 
    filter: 'pending' | 'history' | 'all' = 'all',
    limit?: number
  ): Promise<Task[]> {
    let stateFilter: TaskState[]
    
    switch (filter) {
      case 'pending':
        stateFilter = [TaskState.SUBMITTED, TaskState.IN_REVIEW]
        break
      case 'history':
        stateFilter = [TaskState.APPROVED, TaskState.REJECTED, TaskState.CHANGES_REQUESTED]
        break
      case 'all':
      default:
        stateFilter = [
          TaskState.SUBMITTED, 
          TaskState.IN_REVIEW,
          TaskState.APPROVED, 
          TaskState.REJECTED, 
          TaskState.CHANGES_REQUESTED
        ]
    }

    // For pending tasks, show all submitted/in_review tasks
    // For history/all, include tasks where reviewer has a review
    const whereClause = filter === 'pending' 
      ? { state: { in: stateFilter } }
      : {
          OR: [
            // All pending tasks (visible to any reviewer)
            { state: { in: [TaskState.SUBMITTED, TaskState.IN_REVIEW] } },
            // Tasks this reviewer has reviewed
            {
              reviews: {
                some: { reviewerId },
              },
              state: { in: [TaskState.APPROVED, TaskState.REJECTED, TaskState.CHANGES_REQUESTED] },
            },
            // Tasks assigned to this reviewer
            {
              reviewerId,
              state: { in: [TaskState.APPROVED, TaskState.REJECTED, TaskState.CHANGES_REQUESTED] },
            },
          ],
        }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      select: {
        ...TASK_SELECT_LIST,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      ...(limit && { take: limit }),
    })

    return tasks as unknown as Task[]
  }

  /**
   * Duplicate a task (creates a copy in DRAFT state)
   */
  static async duplicateTask(taskId: string, user: User): Promise<Task> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask) {
      throw new NotFoundError('Task')
    }

    // Check if user is the author (only authors can duplicate their tasks)
    if (existingTask.authorId !== user.id) {
      throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_AUTHOR_ONLY)
    }

    // Create a copy with a new title
    const task = await prisma.task.create({
      data: {
        title: `${existingTask.title} (Copy)`,
        instruction: existingTask.instruction,
        difficulty: existingTask.difficulty,
        categories: existingTask.categories,
        maxAgentTimeoutSec: existingTask.maxAgentTimeoutSec,
        maxTestTimeoutSec: existingTask.maxTestTimeoutSec,
        taskYaml: existingTask.taskYaml,
        dockerComposeYaml: existingTask.dockerComposeYaml,
        solutionSh: existingTask.solutionSh,
        runTestsSh: existingTask.runTestsSh,
        testsJson: existingTask.testsJson,
        state: TaskState.DRAFT,
        authorId: user.id,
      },
      include: TASK_INCLUDE_FULL,
    })

    // Create audit log and history snapshot
    await Promise.all([
      AuditService.log({
        action: AuditAction.TASK_CREATED,
        entityType: 'task',
        entityId: task.id,
        userId: user.id,
        userName: user.name || undefined,
        userEmail: user.email,
        metadata: { 
          title: task.title, 
          state: task.state,
          duplicatedFrom: taskId,
        },
      }),
      TaskHistoryService.createSnapshot({
        task: task as unknown as Task,
        changedBy: user.id,
        changeType: 'created',
      }),
    ])

    return task as unknown as Task
  }
}
