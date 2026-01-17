import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { prisma } from '@repo/db'

export const apiRouter = Router()

// Example protected route
apiRouter.get('/tasks', async (req, res) => {
  try {
    const { userId } = getAuth(req)
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user from Prisma
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Your business logic here
    res.json({ message: 'API route working', userId: user.id })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
