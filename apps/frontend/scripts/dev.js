#!/usr/bin/env node
const { spawn } = require('child_process')
const path = require('path')
const dotenv = require('dotenv')

// Load root .env.local
const rootEnvPath = path.resolve(__dirname, '../../../.env.local')
dotenv.config({ path: rootEnvPath })

// Get PORT from env or default
const port = process.env.PORT || '3875'

// Spawn next dev with PORT
const nextDev = spawn('next', ['dev', '-p', port], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..'),
})

nextDev.on('error', (error) => {
  console.error('Failed to start Next.js:', error)
  process.exit(1)
})

nextDev.on('exit', (code) => {
  process.exit(code || 0)
})
