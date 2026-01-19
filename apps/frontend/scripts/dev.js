#!/usr/bin/env node
const { spawn, execSync } = require('child_process')
const path = require('path')
const dotenv = require('dotenv')
const fs = require('fs')

// Load root .env.local
const rootEnvPath = path.resolve(__dirname, '../../../.env.local')
dotenv.config({ path: rootEnvPath })

// Check if Prisma client exists, if not generate it
const prismaClientPath = path.resolve(__dirname, '../../../node_modules/@prisma/client')
if (!fs.existsSync(prismaClientPath)) {
  console.log('Prisma client not found. Generating...')
  try {
    execSync('npm run db:generate', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../../..'),
    })
    console.log('Prisma client generated successfully.')
  } catch (error) {
    console.error('Failed to generate Prisma client:', error.message)
    process.exit(1)
  }
}

// Get PORT from env or default
const port = process.env.PORT || '3875'

// Spawn next dev with PORT
// Default to webpack dev server to avoid Turbopack HMR factory issues.
// Set NEXT_DEV_TURBOPACK=1 to opt back into Turbopack.
const useTurbopack = process.env.NEXT_DEV_TURBOPACK === '1'
const devArgs = ['dev', '-p', port]
if (!useTurbopack) {
  devArgs.push('--webpack')
}

const nextDev = spawn('next', devArgs, {
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
