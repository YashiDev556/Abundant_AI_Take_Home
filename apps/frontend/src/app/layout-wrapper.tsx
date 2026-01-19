"use client"

import { SignedIn, SignedOut } from '@clerk/nextjs'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { useThemeShortcut } from '@/hooks/use-theme-shortcut'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  useThemeShortcut()
  return (
    <>
      <SignedIn>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="bg-transparent flex flex-col">
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/50 bg-background px-4 sticky top-0 z-40">
              <SidebarTrigger className="-ml-1 hover:bg-secondary" />
              <Separator orientation="vertical" className="h-5" />
              <div className="flex-1" />
            </header>
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </SignedIn>
      <SignedOut>
        <main className="flex flex-1 flex-col">
          {children}
        </main>
      </SignedOut>
    </>
  )
}
