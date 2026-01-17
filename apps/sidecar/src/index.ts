/**
 * Sidecar Service Entry Point
 * Handles file operations and other auxiliary functionality
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
import { fileRouter } from './routes/files'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.SIDECAR_PORT || process.env.PORT || 4001

// ==================== Middleware ====================

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(clerkMiddleware())

// ==================== Routes ====================

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// File operations (protected)
app.use('/api/files', requireAuth(), fileRouter)

// ==================== Error Handling ====================

app.use(errorHandler)

// ==================== Server Start ====================

app.listen(PORT, () => {
  console.log(`🚀 Sidecar running on http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
})
