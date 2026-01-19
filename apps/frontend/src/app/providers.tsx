'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => {
      return new QueryClient({
        defaultOptions: {
          queries: {
            // ULTRA AGGRESSIVE caching - data stays fresh for 5 minutes
            staleTime: 5 * 60 * 1000, // 5 minutes - data won't refetch unless explicitly invalidated
            // Keep in cache for 15 minutes
            gcTime: 15 * 60 * 1000, // 15 minutes - long-term memory
            // Only refetch on window focus if data is stale
            refetchOnWindowFocus: 'always', // Background refresh for latest data
            // Don't refetch on reconnect (use cached data)
            refetchOnReconnect: false,
            // NEVER refetch on mount - always use cache first
            refetchOnMount: false,
            // Retry failed requests 2 times (more resilient)
            retry: 2,
            // Fast retry with exponential backoff
            retryDelay: (attemptIndex) => Math.min(50 * 2 ** attemptIndex, 500),
            // Network mode - online first, cache fallback
            networkMode: 'online',
          },
          mutations: {
            // Retry mutations twice on failure
            retry: 2,
            retryDelay: 100,
          },
        },
      })
    }
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
