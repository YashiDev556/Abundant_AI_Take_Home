'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reviewerApi } from '@/lib/api-client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Search,
  FileText,
  Calendar,
  User,
  ArrowRight,
  Clock,
  Timer,
  CheckSquare,
  Filter,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const getStateBadgeClass = (state: string) => {
  const classes: Record<string, string> = {
    SUBMITTED: 'badge-submitted',
    IN_REVIEW: 'badge-in-review',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    CHANGES_REQUESTED: 'badge-changes',
  }
  return classes[state] || 'badge-submitted'
}

const getDifficultyBadgeClass = (difficulty: string) => {
  const classes: Record<string, string> = {
    EASY: 'badge-easy',
    MEDIUM: 'badge-medium',
    HARD: 'badge-hard',
  }
  return classes[difficulty] || ''
}

const getStateIcon = (state: string) => {
  switch (state) {
    case 'APPROVED':
      return CheckCircle2
    case 'REJECTED':
      return XCircle
    case 'CHANGES_REQUESTED':
      return AlertCircle
    case 'IN_REVIEW':
      return Timer
    default:
      return Clock
  }
}

const getStateColor = (state: string) => {
  switch (state) {
    case 'APPROVED':
      return 'text-emerald-500'
    case 'REJECTED':
      return 'text-red-500'
    case 'CHANGES_REQUESTED':
      return 'text-orange-500'
    case 'IN_REVIEW':
      return 'text-blue-500'
    default:
      return 'text-amber-500'
  }
}

export default function ReviewerDashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'history'>('all')

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['reviewer', 'tasks', activeTab],
    queryFn: () => reviewerApi.listTasks({ filter: activeTab }),
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  // Filter tasks by search
  const filteredTasks = tasks.filter((task: any) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.author?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.author?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Count tasks by category
  const pendingTasks = tasks.filter((t: any) => t.state === 'SUBMITTED' || t.state === 'IN_REVIEW')
  const historyTasks = tasks.filter((t: any) => 
    t.state === 'APPROVED' || t.state === 'REJECTED' || t.state === 'CHANGES_REQUESTED'
  )

  if (error) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/20">
            <CheckSquare className="size-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
            <p className="text-muted-foreground">Tasks awaiting your review</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Error: {error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/20">
            <CheckSquare className="size-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight gradient-text-reviewer">Review Queue</h1>
            <p className="text-muted-foreground">
              {activeTab === 'history' 
                ? `${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''} you've reviewed`
                : `${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''} ${activeTab === 'pending' ? 'awaiting review' : 'total'}`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'pending' | 'history')} className="w-full sm:w-auto">
          <TabsList className="bg-secondary/30">
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="ml-1 text-xs">{tasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="size-3.5" />
              Pending
              <Badge variant="secondary" className="ml-1 text-xs bg-amber-500/20 text-amber-400">{pendingTasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="size-3.5" />
              My Reviews
              <Badge variant="secondary" className="ml-1 text-xs bg-teal-500/20 text-teal-400">{historyTasks.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2 mt-3">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4">
              <CheckSquare className="size-7 text-teal-500" />
            </div>
            <h3 className="font-semibold mb-2">
              {tasks.length === 0 ? 'All caught up!' : 'No matching tasks'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {tasks.length === 0
                ? 'There are no tasks awaiting review right now. Check back later!'
                : 'Try adjusting your filters or search query'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task: any, index: number) => {
            const StateIcon = getStateIcon(task.state)
            const isPending = task.state === 'SUBMITTED' || task.state === 'IN_REVIEW'
            const isCompleted = task.state === 'APPROVED' || task.state === 'REJECTED' || task.state === 'CHANGES_REQUESTED'
            
            return (
              <Link key={task.id} href={`/reviewer/tasks/${task.id}`}>
                <Card
                  className={cn(
                    "border-border/50 hover:border-teal-500/30 transition-all cursor-pointer",
                    "hover:bg-secondary/20 group animate-slide-up"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        isCompleted ? "bg-secondary/30" : "bg-secondary/50 group-hover:bg-teal-500/10"
                      )}>
                        <StateIcon className={cn("size-6", getStateColor(task.state))} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate group-hover:text-teal-400 transition-colors">
                              {task.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {task.instruction?.substring(0, 150)}
                              {task.instruction?.length > 150 ? '...' : ''}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={isCompleted ? "outline" : "default"}
                            className={cn(
                              "flex-shrink-0",
                              !isCompleted && (task.state === 'IN_REVIEW'
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-teal-600 hover:bg-teal-700")
                            )}
                          >
                            {isCompleted ? 'View' : (task.state === 'IN_REVIEW' ? 'Continue' : 'Review')}
                            <ArrowRight className="size-3.5 ml-1" />
                          </Button>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <Badge variant="outline" className={cn("text-xs", getStateBadgeClass(task.state))}>
                            {task.state.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={cn("text-xs", getDifficultyBadgeClass(task.difficulty))}>
                            {task.difficulty}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="size-3" />
                            {task.author?.name || task.author?.email}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="size-3" />
                            {new Date(task.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Previous reviews indicator */}
                        {task.reviews && task.reviews.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <Badge variant="outline" className="text-xs">
                              {task.reviews.length} review{task.reviews.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
