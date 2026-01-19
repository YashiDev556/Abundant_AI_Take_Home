/**
 * TaskService Unit Tests
 * Comprehensive tests for task CRUD operations and state transitions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockTask, createMockUser, createMockPrisma } from '../mocks/prisma'

// Mock the @repo/db module
vi.mock('@repo/db', () => {
  const mockPrisma = {
    task: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    taskHistory: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  }
  
  return {
    prisma: mockPrisma,
    AuditAction: {
      TASK_CREATED: 'TASK_CREATED',
      TASK_UPDATED: 'TASK_UPDATED',
      TASK_SUBMITTED: 'TASK_SUBMITTED',
      TASK_DELETED: 'TASK_DELETED',
      TASK_APPROVED: 'TASK_APPROVED',
      TASK_REJECTED: 'TASK_REJECTED',
      TASK_CHANGES_REQUESTED: 'TASK_CHANGES_REQUESTED',
    },
  }
})

// Import after mocking
import { TaskService } from '../../services/task.service'
import { prisma } from '@repo/db'
import { 
  NotFoundError, 
  ForbiddenError, 
  BadRequestError 
} from '../../lib/errors'
import { Difficulty } from '@repo/types'

describe('TaskService', () => {
  const mockPrisma = prisma as unknown as ReturnType<typeof createMockPrisma>
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =============================================================================
  // GET TASKS BY AUTHOR
  // =============================================================================

  describe('getTasksByAuthor', () => {
    it('should return tasks for a specific author', async () => {
      const mockTasks = [
        createMockTask({ id: 'task-1', title: 'Task 1' }),
        createMockTask({ id: 'task-2', title: 'Task 2' }),
      ]
      mockPrisma.task.findMany.mockResolvedValue(mockTasks)

      const result = await TaskService.getTasksByAuthor('user-1')

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { authorId: 'user-1' },
          orderBy: { createdAt: 'desc' },
        })
      )
      expect(result).toHaveLength(2)
    })

    it('should respect limit parameter', async () => {
      const mockTasks = [createMockTask()]
      mockPrisma.task.findMany.mockResolvedValue(mockTasks)

      await TaskService.getTasksByAuthor('user-1', 5)

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      )
    })

    it('should return empty array when no tasks exist', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])

      const result = await TaskService.getTasksByAuthor('user-1')

      expect(result).toEqual([])
    })
  })

  // =============================================================================
  // GET TASK BY ID
  // =============================================================================

  describe('getTaskById', () => {
    it('should return task when found and user is author', async () => {
      const mockTask = createMockTask({ authorId: 'user-1' })
      const mockUser = createMockUser({ id: 'user-1', role: 'USER' })
      mockPrisma.task.findUnique.mockResolvedValue(mockTask)

      const result = await TaskService.getTaskById('task-1', mockUser as any)

      expect(result.id).toBe('task-1')
    })

    it('should return task when user is reviewer', async () => {
      const mockTask = createMockTask({ authorId: 'other-user' })
      const mockUser = createMockUser({ id: 'reviewer-1', role: 'REVIEWER' })
      mockPrisma.task.findUnique.mockResolvedValue(mockTask)

      const result = await TaskService.getTaskById('task-1', mockUser as any)

      expect(result.id).toBe('task-1')
    })

    it('should throw NotFoundError when task does not exist', async () => {
      const mockUser = createMockUser()
      mockPrisma.task.findUnique.mockResolvedValue(null)

      await expect(
        TaskService.getTaskById('nonexistent', mockUser as any)
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError when user is not author and not reviewer', async () => {
      const mockTask = createMockTask({ authorId: 'other-user' })
      const mockUser = createMockUser({ id: 'user-1', role: 'USER' })
      mockPrisma.task.findUnique.mockResolvedValue(mockTask)

      await expect(
        TaskService.getTaskById('task-1', mockUser as any)
      ).rejects.toThrow(ForbiddenError)
    })
  })

  // =============================================================================
  // CREATE TASK
  // =============================================================================

  describe('createTask', () => {
    const validTaskData = {
      title: 'New Task',
      instruction: 'Task instructions',
      difficulty: Difficulty.MEDIUM,
      categories: 'testing',
      maxAgentTimeoutSec: 300,
      maxTestTimeoutSec: 60,
    }

    it('should create task in DRAFT state', async () => {
      const mockUser = createMockUser()
      const createdTask = createMockTask({ ...validTaskData, state: 'DRAFT' })
      mockPrisma.task.create.mockResolvedValue(createdTask)
      mockPrisma.auditLog.create.mockResolvedValue({})
      mockPrisma.taskHistory.findFirst.mockResolvedValue(null)
      mockPrisma.taskHistory.create.mockResolvedValue({})

      const result = await TaskService.createTask(validTaskData, 'user-1', mockUser as any)

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ...validTaskData,
            state: 'DRAFT',
            authorId: 'user-1',
          }),
        })
      )
      expect(result.state).toBe('DRAFT')
    })

    it('should create audit log entry', async () => {
      const mockUser = createMockUser()
      const createdTask = createMockTask(validTaskData)
      mockPrisma.task.create.mockResolvedValue(createdTask)
      mockPrisma.auditLog.create.mockResolvedValue({})
      mockPrisma.taskHistory.findFirst.mockResolvedValue(null)
      mockPrisma.taskHistory.create.mockResolvedValue({})

      await TaskService.createTask(validTaskData, 'user-1', mockUser as any)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TASK_CREATED',
            entityType: 'task',
          }),
        })
      )
    })

    it('should create task history snapshot', async () => {
      const mockUser = createMockUser()
      const createdTask = createMockTask(validTaskData)
      mockPrisma.task.create.mockResolvedValue(createdTask)
      mockPrisma.auditLog.create.mockResolvedValue({})
      mockPrisma.taskHistory.findFirst.mockResolvedValue(null)
      mockPrisma.taskHistory.create.mockResolvedValue({})

      await TaskService.createTask(validTaskData, 'user-1', mockUser as any)

      expect(mockPrisma.taskHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: 'created',
          }),
        })
      )
    })

    it('should include optional fields when provided', async () => {
      const mockUser = createMockUser()
      const taskDataWithOptional = {
        ...validTaskData,
        taskYaml: 'version: 1',
        dockerComposeYaml: 'services:',
        solutionSh: '#!/bin/bash',
      }
      const createdTask = createMockTask(taskDataWithOptional)
      mockPrisma.task.create.mockResolvedValue(createdTask)
      mockPrisma.auditLog.create.mockResolvedValue({})
      mockPrisma.taskHistory.findFirst.mockResolvedValue(null)
      mockPrisma.taskHistory.create.mockResolvedValue({})

      await TaskService.createTask(taskDataWithOptional, 'user-1', mockUser as any)

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskYaml: 'version: 1',
            dockerComposeYaml: 'services:',
            solutionSh: '#!/bin/bash',
          }),
        })
      )
    })
  })

  // =============================================================================
  // UPDATE TASK
  // =============================================================================

  describe('updateTask', () => {
    it('should update task when in DRAFT state', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'DRAFT', authorId: 'user-1' })
      const updatedTask = createMockTask({ state: 'DRAFT', title: 'Updated Title' })
      
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)
      mockPrisma.task.update.mockResolvedValue(updatedTask)
      mockPrisma.auditLog.create.mockResolvedValue({})
      mockPrisma.taskHistory.findFirst.mockResolvedValue({ version: 1 })
      mockPrisma.taskHistory.create.mockResolvedValue({})

      const result = await TaskService.updateTask(
        'task-1',
        { title: 'Updated Title' },
        mockUser as any
      )

      expect(result.title).toBe('Updated Title')
    })

    it('should update task when in CHANGES_REQUESTED state', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'CHANGES_REQUESTED', authorId: 'user-1' })
      const updatedTask = createMockTask({ state: 'CHANGES_REQUESTED', title: 'Fixed Title' })
      
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)
      mockPrisma.task.update.mockResolvedValue(updatedTask)
      mockPrisma.auditLog.create.mockResolvedValue({})
      mockPrisma.taskHistory.findFirst.mockResolvedValue({ version: 2 })
      mockPrisma.taskHistory.create.mockResolvedValue({})

      const result = await TaskService.updateTask(
        'task-1',
        { title: 'Fixed Title' },
        mockUser as any
      )

      expect(result.title).toBe('Fixed Title')
    })

    it('should throw NotFoundError when task does not exist', async () => {
      const mockUser = createMockUser()
      mockPrisma.task.findUnique.mockResolvedValue(null)

      await expect(
        TaskService.updateTask('nonexistent', { title: 'New Title' }, mockUser as any)
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError when user is not author', async () => {
      const mockUser = createMockUser({ id: 'other-user' })
      const existingTask = createMockTask({ authorId: 'user-1', state: 'DRAFT' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.updateTask('task-1', { title: 'New Title' }, mockUser as any)
      ).rejects.toThrow(ForbiddenError)
    })

    it('should throw BadRequestError when task is SUBMITTED', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'SUBMITTED', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.updateTask('task-1', { title: 'New Title' }, mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })

    it('should throw BadRequestError when task is IN_REVIEW', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'IN_REVIEW', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.updateTask('task-1', { title: 'New Title' }, mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })

    it('should throw BadRequestError when task is APPROVED', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'APPROVED', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.updateTask('task-1', { title: 'New Title' }, mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })

    it('should throw BadRequestError when task is REJECTED', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'REJECTED', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.updateTask('task-1', { title: 'New Title' }, mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })
  })

  // =============================================================================
  // SUBMIT TASK
  // =============================================================================

  describe('submitTask', () => {
    it('should submit DRAFT task', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ 
        state: 'DRAFT', 
        authorId: 'user-1',
        title: 'Test Task',
        instruction: 'Test instruction',
      })
      const submittedTask = createMockTask({ state: 'SUBMITTED' })
      
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)
      mockPrisma.task.update.mockResolvedValue(submittedTask)
      mockPrisma.auditLog.create.mockResolvedValue({})
      mockPrisma.taskHistory.findFirst.mockResolvedValue({ version: 1 })
      mockPrisma.taskHistory.create.mockResolvedValue({})

      const result = await TaskService.submitTask('task-1', mockUser as any)

      expect(result.state).toBe('SUBMITTED')
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            state: 'SUBMITTED',
            reviewerId: null,
          }),
        })
      )
    })

    it('should submit REJECTED task (resubmission)', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ 
        state: 'REJECTED', 
        authorId: 'user-1',
        title: 'Test Task',
        instruction: 'Test instruction',
      })
      const submittedTask = createMockTask({ state: 'SUBMITTED' })
      
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)
      mockPrisma.task.update.mockResolvedValue(submittedTask)
      mockPrisma.auditLog.create.mockResolvedValue({})
      mockPrisma.taskHistory.findFirst.mockResolvedValue({ version: 2 })
      mockPrisma.taskHistory.create.mockResolvedValue({})

      const result = await TaskService.submitTask('task-1', mockUser as any)

      expect(result.state).toBe('SUBMITTED')
    })

    it('should submit CHANGES_REQUESTED task (resubmission)', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ 
        state: 'CHANGES_REQUESTED', 
        authorId: 'user-1',
        title: 'Test Task',
        instruction: 'Test instruction',
      })
      const submittedTask = createMockTask({ state: 'SUBMITTED' })
      
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)
      mockPrisma.task.update.mockResolvedValue(submittedTask)
      mockPrisma.auditLog.create.mockResolvedValue({})
      mockPrisma.taskHistory.findFirst.mockResolvedValue({ version: 3 })
      mockPrisma.taskHistory.create.mockResolvedValue({})

      const result = await TaskService.submitTask('task-1', mockUser as any)

      expect(result.state).toBe('SUBMITTED')
    })

    it('should throw NotFoundError when task does not exist', async () => {
      const mockUser = createMockUser()
      mockPrisma.task.findUnique.mockResolvedValue(null)

      await expect(
        TaskService.submitTask('nonexistent', mockUser as any)
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError when user is not author', async () => {
      const mockUser = createMockUser({ id: 'other-user' })
      const existingTask = createMockTask({ authorId: 'user-1', state: 'DRAFT' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.submitTask('task-1', mockUser as any)
      ).rejects.toThrow(ForbiddenError)
    })

    it('should throw BadRequestError when task is SUBMITTED', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'SUBMITTED', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.submitTask('task-1', mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })

    it('should throw BadRequestError when task is IN_REVIEW', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'IN_REVIEW', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.submitTask('task-1', mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })

    it('should throw BadRequestError when task is APPROVED', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'APPROVED', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.submitTask('task-1', mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })

    it('should throw BadRequestError when title is missing', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ 
        state: 'DRAFT', 
        authorId: 'user-1',
        title: '',
        instruction: 'Test instruction',
      })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.submitTask('task-1', mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })

    it('should throw BadRequestError when instruction is missing', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ 
        state: 'DRAFT', 
        authorId: 'user-1',
        title: 'Test Task',
        instruction: '',
      })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.submitTask('task-1', mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })
  })

  // =============================================================================
  // DELETE TASK
  // =============================================================================

  describe('deleteTask', () => {
    it('should delete DRAFT task', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'DRAFT', authorId: 'user-1' })
      
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)
      mockPrisma.task.delete.mockResolvedValue(existingTask)
      mockPrisma.auditLog.create.mockResolvedValue({})

      await TaskService.deleteTask('task-1', mockUser as any)

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      })
    })

    it('should delete REJECTED task', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'REJECTED', authorId: 'user-1' })
      
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)
      mockPrisma.task.delete.mockResolvedValue(existingTask)
      mockPrisma.auditLog.create.mockResolvedValue({})

      await TaskService.deleteTask('task-1', mockUser as any)

      expect(mockPrisma.task.delete).toHaveBeenCalled()
    })

    it('should create audit log on delete', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'DRAFT', authorId: 'user-1' })
      
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)
      mockPrisma.task.delete.mockResolvedValue(existingTask)
      mockPrisma.auditLog.create.mockResolvedValue({})

      await TaskService.deleteTask('task-1', mockUser as any)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TASK_DELETED',
          }),
        })
      )
    })

    it('should throw NotFoundError when task does not exist', async () => {
      const mockUser = createMockUser()
      mockPrisma.task.findUnique.mockResolvedValue(null)

      await expect(
        TaskService.deleteTask('nonexistent', mockUser as any)
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError when user is not author', async () => {
      const mockUser = createMockUser({ id: 'other-user' })
      const existingTask = createMockTask({ authorId: 'user-1', state: 'DRAFT' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.deleteTask('task-1', mockUser as any)
      ).rejects.toThrow(ForbiddenError)
    })

    it('should throw BadRequestError when task is SUBMITTED', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'SUBMITTED', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.deleteTask('task-1', mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })

    it('should throw BadRequestError when task is IN_REVIEW', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'IN_REVIEW', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.deleteTask('task-1', mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })

    it('should throw BadRequestError when task is APPROVED', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'APPROVED', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.deleteTask('task-1', mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })

    it('should throw BadRequestError when task is CHANGES_REQUESTED', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ state: 'CHANGES_REQUESTED', authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.deleteTask('task-1', mockUser as any)
      ).rejects.toThrow(BadRequestError)
    })
  })

  // =============================================================================
  // DUPLICATE TASK
  // =============================================================================

  describe('duplicateTask', () => {
    it('should create a copy of the task in DRAFT state', async () => {
      const mockUser = createMockUser({ id: 'user-1' })
      const existingTask = createMockTask({ 
        authorId: 'user-1',
        title: 'Original Task',
        state: 'APPROVED',
        instruction: 'Test instruction',
        difficulty: 'HARD',
        taskYaml: 'yaml content',
      })
      const duplicatedTask = createMockTask({ 
        id: 'task-2',
        title: 'Original Task (Copy)',
        state: 'DRAFT',
      })
      
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)
      mockPrisma.task.create.mockResolvedValue(duplicatedTask)
      mockPrisma.auditLog.create.mockResolvedValue({})
      mockPrisma.taskHistory.findFirst.mockResolvedValue(null)
      mockPrisma.taskHistory.create.mockResolvedValue({})

      const result = await TaskService.duplicateTask('task-1', mockUser as any)

      expect(result.state).toBe('DRAFT')
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Original Task (Copy)',
            state: 'DRAFT',
            authorId: 'user-1',
            instruction: 'Test instruction',
            difficulty: 'HARD',
            taskYaml: 'yaml content',
          }),
        })
      )
    })

    it('should throw NotFoundError when task does not exist', async () => {
      const mockUser = createMockUser()
      mockPrisma.task.findUnique.mockResolvedValue(null)

      await expect(
        TaskService.duplicateTask('nonexistent', mockUser as any)
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError when user is not author', async () => {
      const mockUser = createMockUser({ id: 'other-user' })
      const existingTask = createMockTask({ authorId: 'user-1' })
      mockPrisma.task.findUnique.mockResolvedValue(existingTask)

      await expect(
        TaskService.duplicateTask('task-1', mockUser as any)
      ).rejects.toThrow(ForbiddenError)
    })
  })

  // =============================================================================
  // GET TASKS FOR REVIEW
  // =============================================================================

  describe('getTasksForReview', () => {
    it('should return tasks in SUBMITTED or IN_REVIEW state', async () => {
      const mockTasks = [
        createMockTask({ id: 'task-1', state: 'SUBMITTED' }),
        createMockTask({ id: 'task-2', state: 'IN_REVIEW' }),
      ]
      mockPrisma.task.findMany.mockResolvedValue(mockTasks)

      const result = await TaskService.getTasksForReview()

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            state: {
              in: ['SUBMITTED', 'IN_REVIEW'],
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      )
      expect(result).toHaveLength(2)
    })

    it('should respect limit parameter', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])

      await TaskService.getTasksForReview(10)

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      )
    })
  })

  // =============================================================================
  // GET REVIEWER HISTORY
  // =============================================================================

  describe('getReviewerHistory', () => {
    it('should return tasks reviewed by the reviewer', async () => {
      const mockTasks = [
        createMockTask({ id: 'task-1', state: 'APPROVED', reviewerId: 'reviewer-1' }),
        createMockTask({ id: 'task-2', state: 'REJECTED', reviewerId: 'reviewer-1' }),
      ]
      mockPrisma.task.findMany.mockResolvedValue(mockTasks)

      const result = await TaskService.getReviewerHistory('reviewer-1')

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: {
              in: ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'],
            },
          }),
          orderBy: { updatedAt: 'desc' },
        })
      )
      expect(result).toHaveLength(2)
    })
  })

  // =============================================================================
  // GET REVIEWER TASKS (with filter)
  // =============================================================================

  describe('getReviewerTasks', () => {
    it('should return pending tasks when filter is pending', async () => {
      const mockTasks = [
        createMockTask({ id: 'task-1', state: 'SUBMITTED' }),
      ]
      mockPrisma.task.findMany.mockResolvedValue(mockTasks)

      await TaskService.getReviewerTasks('reviewer-1', 'pending')

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            state: {
              in: ['SUBMITTED', 'IN_REVIEW'],
            },
          },
        })
      )
    })

    it('should return history tasks when filter is history', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])

      await TaskService.getReviewerTasks('reviewer-1', 'history')

      expect(mockPrisma.task.findMany).toHaveBeenCalled()
    })

    it('should return all tasks when filter is all', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])

      await TaskService.getReviewerTasks('reviewer-1', 'all')

      expect(mockPrisma.task.findMany).toHaveBeenCalled()
    })

    it('should default to all when no filter provided', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])

      await TaskService.getReviewerTasks('reviewer-1')

      expect(mockPrisma.task.findMany).toHaveBeenCalled()
    })
  })
})
