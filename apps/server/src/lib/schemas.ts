/**
 * Validation Schemas
 * Zod schemas for request validation
 */

import { z } from 'zod'
import {
  Difficulty,
  ReviewDecision,
  FIELD_LIMITS,
  MIN_TIMEOUTS,
  MAX_TIMEOUTS,
} from '@repo/types'

// ==================== Task Schemas ====================

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(FIELD_LIMITS.TITLE.MIN, 'Title is required')
    .max(FIELD_LIMITS.TITLE.MAX, `Title must be at most ${FIELD_LIMITS.TITLE.MAX} characters`),
  instruction: z
    .string()
    .min(FIELD_LIMITS.INSTRUCTION.MIN, 'Instruction is required')
    .max(FIELD_LIMITS.INSTRUCTION.MAX, `Instruction must be at most ${FIELD_LIMITS.INSTRUCTION.MAX} characters`),
  difficulty: z.nativeEnum(Difficulty, {
    errorMap: () => ({ message: 'Invalid difficulty level' }),
  }),
  categories: z
    .string()
    .min(FIELD_LIMITS.CATEGORIES.MIN, 'Categories are required')
    .max(FIELD_LIMITS.CATEGORIES.MAX, `Categories must be at most ${FIELD_LIMITS.CATEGORIES.MAX} characters`),
  maxAgentTimeoutSec: z
    .number()
    .int('Agent timeout must be an integer')
    .min(MIN_TIMEOUTS.AGENT, `Agent timeout must be at least ${MIN_TIMEOUTS.AGENT} seconds`)
    .max(MAX_TIMEOUTS.AGENT, `Agent timeout must be at most ${MAX_TIMEOUTS.AGENT} seconds`),
  maxTestTimeoutSec: z
    .number()
    .int('Test timeout must be an integer')
    .min(MIN_TIMEOUTS.TEST, `Test timeout must be at least ${MIN_TIMEOUTS.TEST} seconds`)
    .max(MAX_TIMEOUTS.TEST, `Test timeout must be at most ${MAX_TIMEOUTS.TEST} seconds`),
  taskYaml: z.string().optional(),
  dockerComposeYaml: z.string().optional(),
  solutionSh: z.string().optional(),
  runTestsSh: z.string().optional(),
  testsJson: z.string().optional(),
})

export const updateTaskSchema = createTaskSchema.partial()

// ==================== Review Schemas ====================

export const submitReviewSchema = z.object({
  decision: z.nativeEnum(ReviewDecision, {
    errorMap: () => ({ message: 'Invalid review decision' }),
  }),
  comment: z
    .string()
    .max(FIELD_LIMITS.COMMENT.MAX, `Comment must be at most ${FIELD_LIMITS.COMMENT.MAX} characters`)
    .optional(),
})

// ==================== Param Schemas ====================

export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
})

// ==================== Query Schemas ====================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// Export types inferred from schemas
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>
export type IdParam = z.infer<typeof idParamSchema>
export type PaginationQuery = z.infer<typeof paginationSchema>
