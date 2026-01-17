import { type Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import { ReactQueryProvider } from './providers'
import { LayoutWrapper } from './layout-wrapper'
import { Toaster } from '@/components/ui/toaster'
import { UserRoleProvider } from '@/contexts/user-role-context'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Terminal-Bench | Task Review Platform',
  description: 'Submit and review tasks for Terminal-Bench 2.0 - A powerful task management and review system',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  
  // During build, if Clerk key is missing, provide a dummy key to prevent build failure
  // This should be set in Vercel environment variables for production
  const publishableKey = clerkKey || (process.env.NODE_ENV === 'production' ? 'pk_test_dummy' : '')
  
  return (
    <ClerkProvider
      publishableKey={publishableKey}
    >
      <html lang="en" className="dark">
        <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased bg-gradient-animated min-h-screen`}>
          <div className="noise-overlay" />
          <ReactQueryProvider>
            <UserRoleProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
              <Toaster />
            </UserRoleProvider>
          </ReactQueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
