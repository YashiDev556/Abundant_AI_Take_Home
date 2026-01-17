/**
 * Validation Middleware
 * Request validation using Zod schemas
 */

import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { ValidationError } from '../lib/errors'

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body)
      
      if (!result.success) {
        throw new ValidationError('Validation error', result.error.errors)
      }

      // Attach validated data to request
      req.validatedBody = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Validate request query parameters against a Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query)
      
      if (!result.success) {
        throw new ValidationError('Validation error', result.error.errors)
      }

      req.validatedQuery = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Validate request params against a Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.params)
      
      if (!result.success) {
        throw new ValidationError('Validation error', result.error.errors)
      }

      req.validatedParams = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}
