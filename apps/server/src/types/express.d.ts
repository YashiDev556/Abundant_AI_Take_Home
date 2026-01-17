/**
 * Express Type Augmentation
 * Adds custom properties to Express Request object
 */

import { User } from '@repo/db'

declare global {
  namespace Express {
    interface Request {
      user?: User
      reviewer?: User
      validatedBody?: unknown
      validatedQuery?: unknown
      validatedParams?: unknown
    }
  }
}

export {}
