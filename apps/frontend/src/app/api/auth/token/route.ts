import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const authResult = await auth()
    const token = await authResult.getToken()
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error getting auth token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
