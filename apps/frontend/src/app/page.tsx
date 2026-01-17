"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { SignedIn, SignedOut, SignIn } from '@clerk/nextjs'
import { tasksApi, reviewerApi } from '@/lib/api-client'
import { useUserRole } from '@/contexts/user-role-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskFormModal } from '@/components/modals'
import {
  FileText,
  PlusCircle,
  CheckSquare,
  Clock,
  ArrowRight,
  Sparkles,
  Terminal,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const getStatusDot = (state: string) => {
  const dots: Record<string, string> = {
    DRAFT: 'status-dot-draft',
    SUBMITTED: 'status-dot-submitted',
    IN_REVIEW: 'status-dot-in-review',
    APPROVED: 'status-dot-approved',
    REJECTED: 'status-dot-rejected',
    CHANGES_REQUESTED: 'status-dot-changes',
  }
  return dots[state] || 'status-dot-draft'
}

const getStateBadgeClass = (state: string) => {
  const classes: Record<string, string> = {
    DRAFT: 'badge-draft',
    SUBMITTED: 'badge-submitted',
    IN_REVIEW: 'badge-in-review',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    CHANGES_REQUESTED: 'badge-changes',
  }
  return classes[state] || 'badge-draft'
}

function CreatorDashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'dashboard'],
    queryFn: () => tasksApi.list({ limit: 20 }),
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  // Calculate stats
  const stats = {
    total: tasks.length,
    draft: tasks.filter((t: any) => t.state === 'DRAFT').length,
    pending: tasks.filter((t: any) => ['SUBMITTED', 'IN_REVIEW'].includes(t.state)).length,
    approved: tasks.filter((t: any) => t.state === 'APPROVED').length,
    needsWork: tasks.filter((t: any) => ['REJECTED', 'CHANGES_REQUESTED'].includes(t.state)).length,
  }

  const recentTasks = tasks.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/20">
              <Sparkles className="size-6 text-amber-400" />
            </div>
            <Badge className="badge-submitted border">Task Creator</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome back to <span className="gradient-text">Terminal-Bench</span>
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Create and manage benchmark tasks for AI agents. Track your submissions and review feedback.
          </p>
          <div className="flex gap-3 mt-6">
            <Button onClick={() => setIsCreateModalOpen(true)} size="lg" className="gap-2">
              <PlusCircle className="size-5" />
              Create New Task
            </Button>
            <Link href="/tasks">
              <Button variant="outline" size="lg" className="gap-2">
                View All Tasks
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <ListTodo className="size-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 hover:border-amber-500/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <Clock className="size-4 text-amber-500" />
                </div>
                <p className="text-3xl font-bold mt-1 text-amber-500">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <CheckCircle2 className="size-4 text-emerald-500" />
                </div>
                <p className="text-3xl font-bold mt-1 text-emerald-500">{stats.approved}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 hover:border-orange-500/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Needs Work</p>
                  <AlertCircle className="size-4 text-orange-500" />
                </div>
                <p className="text-3xl font-bold mt-1 text-orange-500">{stats.needsWork}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Tasks</h2>
          <Link href="/tasks">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              View all
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentTasks.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                <FileText className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No tasks yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first task to get started</p>
              <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
                <PlusCircle className="size-4 mr-2" />
                Create Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentTasks.map((task: any, index: number) => (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <Card className={cn(
                  "border-border/50 hover:border-primary/30 transition-all cursor-pointer hover:bg-secondary/30",
                  "animate-slide-up"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <FileText className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{task.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {task.difficulty} · {new Date(task.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("status-dot", getStatusDot(task.state))} />
                        <Badge variant="outline" className={cn("text-xs", getStateBadgeClass(task.state))}>
                          {task.state.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <TaskFormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={(task) => {
          // Could navigate to task detail or show a toast
        }}
      />
    </div>
  )
}

function ReviewerDashboard() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['reviewer', 'tasks', 'dashboard'],
    queryFn: () => reviewerApi.listTasks({ limit: 20 }),
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  const stats = {
    total: tasks.length,
    submitted: tasks.filter((t: any) => t.state === 'SUBMITTED').length,
    inReview: tasks.filter((t: any) => t.state === 'IN_REVIEW').length,
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent border border-teal-500/20 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-teal-500/20">
              <CheckSquare className="size-6 text-teal-400" />
            </div>
            <Badge className="badge-in-review border">Reviewer</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            <span className="gradient-text-reviewer">Review Dashboard</span>
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Review and approve benchmark tasks submitted by creators. Ensure quality standards are met.
          </p>
          <div className="flex gap-3 mt-6">
            <Link href="/reviewer">
              <Button size="lg" className="gap-2 bg-teal-600 hover:bg-teal-700">
                <CheckSquare className="size-5" />
                Start Reviewing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="border-border/50 hover:border-teal-500/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Queue Total</p>
                  <ListTodo className="size-4 text-teal-500" />
                </div>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 hover:border-amber-500/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Awaiting Review</p>
                  <Clock className="size-4 text-amber-500" />
                </div>
                <p className="text-3xl font-bold mt-1 text-amber-500">{stats.submitted}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 hover:border-blue-500/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <TrendingUp className="size-4 text-blue-500" />
                </div>
                <p className="text-3xl font-bold mt-1 text-blue-500">{stats.inReview}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tasks to Review */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tasks Awaiting Review</h2>
          <Link href="/reviewer">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              View all
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                <CheckCircle2 className="size-6 text-emerald-500" />
              </div>
              <h3 className="font-medium mb-1">All caught up!</h3>
              <p className="text-sm text-muted-foreground">No tasks awaiting review right now</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 5).map((task: any, index: number) => (
              <Link key={task.id} href={`/reviewer/tasks/${task.id}`}>
                <Card className={cn(
                  "border-border/50 hover:border-teal-500/30 transition-all cursor-pointer hover:bg-secondary/30",
                  "animate-slide-up"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <FileText className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{task.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          by {task.author?.name || task.author?.email} · {task.difficulty}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10">
                        Review
                        <ArrowRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { isReviewer } = useUserRole()

  return (
    <>
      <SignedOut>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8">
            {/* Branding */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 flex items-center justify-center">
                <Terminal className="size-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight gradient-text">Terminal-Bench</h1>
                <p className="text-muted-foreground mt-2">Task Review Platform for AI Benchmarking</p>
              </div>
            </div>

            {/* Sign In */}
            <div className="flex justify-center">
              <SignIn
                appearance={{
                  elements: {
                    rootBox: "mx-auto",
                    card: "bg-card border border-border shadow-xl rounded-xl",
                    headerTitle: "text-foreground",
                    headerSubtitle: "text-muted-foreground",
                    socialButtonsBlockButton: "bg-secondary hover:bg-secondary/80 border-border",
                    formButtonPrimary: "bg-primary hover:bg-primary/90",
                    footerActionLink: "text-primary hover:text-primary/80",
                    formFieldInput: "bg-input border-border focus:ring-primary",
                    dividerLine: "bg-border",
                    dividerText: "text-muted-foreground",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="py-6">
          {isReviewer ? <ReviewerDashboard /> : <CreatorDashboard />}
        </div>
      </SignedIn>
    </>
  )
}
