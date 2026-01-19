/**
 * Prisma Client Instance
 * Singleton pattern with connection pooling optimization
 * 
 * IMPORTANT: Uses lazy initialization to prevent "prepared statement already exists" 
 * errors with Supabase connection pooler in Next.js dev mode
 */

import { PrismaClient } from '@prisma/client'

// Global declaration for Next.js hot reloading
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // Get database URL
  const url = process.env.DATABASE_URL || 
              process.env.POSTGRES_PRISMA_URL || 
              process.env.POSTGRES_URL
  
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  // Add pgbouncer=true for Supabase connection pooler (port 6543)
  // This disables prepared statements which cause "prepared statement already exists" errors
  const isPgBouncer = url.includes(':6543') || url.includes('pooler')
  const connectionString = isPgBouncer && !url.includes('pgbouncer=true')
    ? `${url}${url.includes('?') ? '&' : '?'}pgbouncer=true`
    : url

  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn']
      : ['error'],
  })
}

// Use existing instance if available (prevents multiple instances in dev)
// This is the critical fix for "prepared statement already exists" errors
export const prisma: PrismaClient = global.__prisma ?? createPrismaClient()

// Store in global for Next.js dev mode hot reloading
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}

// Re-export all types from Prisma client
export * from '@prisma/client'
