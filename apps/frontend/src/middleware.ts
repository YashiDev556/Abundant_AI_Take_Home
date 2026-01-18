import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)',
  '/api/auth/token', // Allow token endpoint
])

export default clerkMiddleware(async (auth, request) => {
  // Don't protect API routes - they handle auth themselves
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return
  }
  
  // Protect all other routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
