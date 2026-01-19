"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  ClipboardList,
  ArrowLeftRight,
  Terminal,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs"
import { useUserRole } from "@/contexts/user-role-context"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const creatorMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Tasks", url: "/tasks", icon: FileText },
]

const reviewerMenuItems = [
  { title: "Review Queue", url: "/reviewer", icon: ClipboardList },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, setRole, isReviewer } = useUserRole()
  const [showReviewerAlert, setShowReviewerAlert] = useState(false)
  const { user: clerkUser } = useUser()

  const { data: user } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.auth.getMe(),
    staleTime: 5 * 60 * 1000,
  })

  const actualUserRole = user?.role
  const isActuallyReviewer = actualUserRole === 'REVIEWER'
  const userName = clerkUser?.fullName || clerkUser?.firstName || user?.name || 'User'

  const menuItems = isReviewer ? reviewerMenuItems : creatorMenuItems

  const handleRoleSwitch = () => {
    if (isReviewer) {
      setRole('creator')
      router.push('/')
    } else {
      if (isActuallyReviewer) {
        setRole('reviewer')
        router.push('/reviewer')
      } else {
        setShowReviewerAlert(true)
      }
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
                  <Terminal className="h-4 w-4" />
                </div>
                <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                  Terminal-Bench
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Role Switcher */}
        <SidebarGroup className="py-2">
          <button
            onClick={handleRoleSwitch}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm",
              "bg-secondary/50 hover:bg-secondary transition-colors",
              "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-auto"
            )}
          >
            {isReviewer ? (
              <CheckSquare className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
            ) : (
              <FileText className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="group-data-[collapsible=icon]:hidden font-medium">
              {isReviewer ? "Reviewer" : "Creator"}
            </span>
            <ArrowLeftRight className="h-3.5 w-3.5 ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </button>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Navigation */}
        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-9 px-2.5",
                        isActive && "bg-secondary font-medium"
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border">
        <SidebarMenu>
          <SignedIn>
            <SidebarMenuItem>
              <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-7 w-7",
                      userButtonPopoverCard: "bg-popover border border-border shadow-lg",
                      userButtonPopoverActionButton: "hover:bg-secondary",
                    },
                  }}
                />
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate">{userName}</p>
                </div>
                <ThemeToggle />
              </div>
            </SidebarMenuItem>
          </SignedIn>
          <SignedOut>
            <SidebarMenuItem className="space-y-1.5">
              <SignInButton mode="modal">
                <Button size="sm" className="w-full justify-center">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline" size="sm" className="w-full justify-center group-data-[collapsible=icon]:hidden">
                  Create Account
                </Button>
              </SignUpButton>
            </SidebarMenuItem>
          </SignedOut>
        </SidebarMenu>
      </SidebarFooter>

      <AlertDialog open={showReviewerAlert} onOpenChange={setShowReviewerAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reviewer Access Required</AlertDialogTitle>
            <AlertDialogDescription>
              Only users with reviewer status can access reviewer mode.
              Contact an administrator for access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowReviewerAlert(false)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  )
}
