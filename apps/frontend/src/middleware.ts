/**
 * Next.js Middleware
 * OPTIMIZED: Minimal overhead, fast path matching
 * 
 * Note: The homepage (/) handles auth state with Clerk's SignedIn/SignedOut components
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Public routes that don't require authentication
// Homepage uses Clerk's SignedIn/SignedOut to show login UI
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)', 
  '/sign-up(.*)',
  '/api/health(.*)',
])

const isProtectedApiRoute = createRouteMatcher([
  '/api/tasks(.*)',
  '/api/auth(.*)',
  '/api/reviewer(.*)',
  '/api/audit(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  
  // Fast path: Skip auth check for public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }
  
  // Fast path: Protect API routes with minimal overhead
  if (isProtectedApiRoute(req)) {
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }
  
  // Protect app routes - redirect to homepage (which shows sign-in)
  if (!userId) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
