/**
 * Server Application Entry Point
 * Configures Express app with middleware, routes, and error handling
 */

// Load environment variables first
import dotenv from 'dotenv'
import path from 'path'

// Load from root .env.local first (highest priority), then root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
// Fallback to local .env files
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import express from 'express'
import cors from 'cors'
import { clerkMiddleware, requireAuth } from '@clerk/express'
import { errorHandler } from './middleware/errorHandler'
import { authRouter } from './routes/auth'
import { tasksRouter } from './routes/tasks'
import { reviewerRouter } from './routes/reviewer'
import { apiRouter } from './routes/api'
import auditRouter from './routes/audit'

const app = express()
const PORT = process.env.SERVER_PORT || process.env.PORT || 4000

// ==================== Middleware ====================

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// Clerk authentication (applies to all routes)
app.use(clerkMiddleware())

// ==================== Routes ====================

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes (authentication handled within each router)
app.use('/api/auth', authRouter)
app.use('/api/tasks', requireAuth(), tasksRouter)
app.use('/api/reviewer', requireAuth(), reviewerRouter)
app.use('/api/audit', requireAuth(), auditRouter)
app.use('/api', requireAuth(), apiRouter)

// ==================== Error Handling ====================

app.use(errorHandler)

// ==================== Server Start ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
})
