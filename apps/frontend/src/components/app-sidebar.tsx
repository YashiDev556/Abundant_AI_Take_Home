"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  CheckSquare,
  ClipboardList,
  ArrowLeftRight,
  Sparkles,
  Terminal,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import { useUserRole } from "@/contexts/user-role-context"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const creatorMenuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Overview & stats",
  },
  {
    title: "My Tasks",
    url: "/tasks",
    icon: FileText,
    description: "View your tasks",
  },
  {
    title: "Create Task",
    url: "/tasks/new",
    icon: PlusCircle,
    description: "Submit new task",
  },
]

const reviewerMenuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Overview & stats",
  },
  {
    title: "Review Queue",
    url: "/reviewer",
    icon: ClipboardList,
    description: "Tasks to review",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { role, setRole, isReviewer } = useUserRole()
  const [showReviewerAlert, setShowReviewerAlert] = useState(false)

  // Fetch actual user role from API
  const { data: user } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.auth.getMe(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const actualUserRole = user?.role
  const isActuallyReviewer = actualUserRole === 'REVIEWER'

  const menuItems = isReviewer ? reviewerMenuItems : creatorMenuItems

  const handleRoleSwitch = () => {
    if (isReviewer) {
      // Always allow switching from reviewer to creator
      setRole('creator')
    } else {
      // Check if user is actually a reviewer before allowing switch
      if (isActuallyReviewer) {
        setRole('reviewer')
      } else {
        // Show alert dialog for non-reviewers
        setShowReviewerAlert(true)
      }
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/" className="flex items-center gap-3">
                <div className={cn(
                  "flex aspect-square size-8 items-center justify-center rounded-xl transition-all duration-300",
                  isReviewer
                    ? "bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20"
                    : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20"
                )}>
                  <Terminal className="size-4 text-white" />
                </div>
                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className={cn(
                    "font-bold text-base",
                    isReviewer ? "gradient-text-reviewer" : "gradient-text"
                  )}>
                    Terminal-Bench
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isReviewer ? "Reviewer Portal" : "Task Creator"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Role Switcher */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-2">
            Current Mode
          </SidebarGroupLabel>
          <div className="px-2 pb-2 group-data-[collapsible=icon]:px-0">
            <button
              onClick={handleRoleSwitch}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg",
                "bg-secondary/50 hover:bg-secondary transition-all duration-200",
                "border border-border/50 hover:border-primary/30",
                "group/switcher cursor-pointer",
                "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2"
              )}
            >
              <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
                <div className={cn(
                  "p-1.5 rounded-md transition-colors",
                  isReviewer ? "bg-teal-500/20 text-teal-400" : "bg-amber-500/20 text-amber-400"
                )}>
                  {isReviewer ? <CheckSquare className="size-4" /> : <Sparkles className="size-4" />}
                </div>
                <div className="text-left group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium">
                    {isReviewer ? "Reviewer" : "Creator"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Switch to {isReviewer ? "Creator" : "Reviewer"}
                  </p>
                </div>
              </div>
              <ArrowLeftRight className="size-4 text-muted-foreground group-hover/switcher:text-primary transition-colors group-data-[collapsible=icon]:hidden" />
            </button>
          </div>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map((item, index) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-12 transition-all duration-200",
                        isActive && (isReviewer
                          ? "bg-teal-500/10 text-teal-400 border-l-2 border-teal-500"
                          : "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500"
                        ),
                        !isActive && "hover:bg-secondary/50 border-l-2 border-transparent"
                      )}
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-2">
                        <item.icon className={cn(
                          "size-5 transition-colors",
                          isActive && (isReviewer ? "text-teal-400" : "text-amber-400")
                        )} />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.title}</span>
                          <span className="text-[10px] text-muted-foreground">{item.description}</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <SidebarMenu>
          <SignedIn>
            <SidebarMenuItem>
              <div className="flex items-center justify-center px-2 py-2">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-9 w-9 ring-2 ring-border",
                      userButtonPopoverCard: "bg-popover border border-border shadow-xl",
                      userButtonPopoverActionButton: "hover:bg-secondary",
                    },
                  }}
                />
              </div>
            </SidebarMenuItem>
          </SignedIn>
          <SignedOut>
            <SidebarMenuItem className="space-y-2">
              <SignInButton mode="modal">
                <Button variant="default" className="w-full justify-start gap-2">
                  <Sparkles className="size-4" />
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline" className="w-full justify-start gap-2">
                  Create Account
                </Button>
              </SignUpButton>
            </SidebarMenuItem>
          </SignedOut>
        </SidebarMenu>
      </SidebarFooter>

      {/* Alert Dialog for Non-Reviewers */}
      <AlertDialog open={showReviewerAlert} onOpenChange={setShowReviewerAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reviewer Access Required</AlertDialogTitle>
            <AlertDialogDescription>
              You are not a reviewer. Only users with reviewer status can access reviewer mode.
              Please contact an administrator if you need reviewer access.
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
