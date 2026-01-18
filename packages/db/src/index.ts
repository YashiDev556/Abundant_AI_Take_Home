// Import PrismaClient from default location
// Using default output location for better Next.js/Vercel compatibility
import { PrismaClient } from '@prisma/client'

// Prisma client singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Helper to ensure pgbouncer parameter is in connection string
// This prevents "prepared statement does not exist" errors with connection poolers
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || ''
  if (!url) {
    // Return a dummy URL for build time (Prisma generate doesn't need a real connection)
    // This allows the build to succeed even if DATABASE_URL is not set
    return 'postgresql://dummy:dummy@localhost:5432/dummy?pgbouncer=true'
  }
  
  // If already has pgbouncer=true, return as is
  if (url.includes('pgbouncer=true')) return url
  
  // Add pgbouncer=true parameter
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}pgbouncer=true`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Re-export everything from Prisma client
export * from '@prisma/client'
