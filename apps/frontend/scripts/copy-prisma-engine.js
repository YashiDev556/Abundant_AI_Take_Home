/**
 * Copy Prisma engine binaries to Next.js output directory
 * This ensures the engine files are available at runtime on Vercel
 */

const fs = require('fs')
const path = require('path')

const prismaGeneratedPath = path.resolve(__dirname, '../../../packages/db/src/generated')
const nextOutputPath = path.resolve(__dirname, '../.next/server')

// Find all engine binary files
function findEngineFiles(dir) {
  const files = []
  if (!fs.existsSync(dir)) return files
  
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory()) {
      files.push(...findEngineFiles(fullPath))
    } else if (item.includes('query_engine') || item.includes('libquery_engine')) {
      files.push(fullPath)
    }
  }
  
  return files
}

// Copy engine files to Next.js output
function copyEngineFiles() {
  const engineFiles = findEngineFiles(prismaGeneratedPath)
  
  if (engineFiles.length === 0) {
    console.warn('No Prisma engine files found in', prismaGeneratedPath)
    return
  }
  
  // Ensure output directory exists
  if (!fs.existsSync(nextOutputPath)) {
    fs.mkdirSync(nextOutputPath, { recursive: true })
  }
  
  // Copy each engine file
  for (const engineFile of engineFiles) {
    const fileName = path.basename(engineFile)
    const destPath = path.join(nextOutputPath, fileName)
    
    console.log(`Copying ${fileName} to ${destPath}`)
    fs.copyFileSync(engineFile, destPath)
  }
  
  console.log('Prisma engine files copied successfully')
}

// Run if executed directly
if (require.main === module) {
  copyEngineFiles()
}

module.exports = { copyEngineFiles }
