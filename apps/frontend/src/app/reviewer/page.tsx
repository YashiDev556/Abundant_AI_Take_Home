'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewerApi } from '@/lib/api-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Search,
  Calendar,
  User,
  ArrowRight,
  Clock,
  CheckSquare,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  ClipboardCheck,
  ExternalLink,
  ClipboardCopy,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { useToast } from '@/hooks/use-toast'

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
    case 'APPROVED': return CheckCircle2
    case 'REJECTED': return XCircle
    case 'CHANGES_REQUESTED': return AlertCircle
    case 'IN_REVIEW': return Timer
    default: return Clock
  }
}

const getStateColor = (state: string) => {
  switch (state) {
    case 'APPROVED': return 'text-emerald-500'
    case 'REJECTED': return 'text-red-500'
    case 'CHANGES_REQUESTED': return 'text-orange-500'
    case 'IN_REVIEW': return 'text-blue-500'
    default: return 'text-amber-500'
  }
}

export default function ReviewerDashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'history'>('all')

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['reviewer', 'tasks', activeTab],
    queryFn: () => reviewerApi.listTasks({ filter: activeTab }),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  const handleCopyId = (taskId: string) => {
    navigator.clipboard.writeText(taskId)
    toast({
      title: 'Task ID copied',
      description: 'Task ID has been copied to clipboard.',
    })
  }

  const handleStartReview = async (taskId: string) => {
    try {
      await reviewerApi.startReview(taskId)
      queryClient.invalidateQueries({ queryKey: ['reviewer', 'tasks'] })
      toast({
        title: 'Review started',
        description: 'You have started reviewing this task.',
      })
      router.push(`/reviewer/tasks/${taskId}`)
    } catch (error: any) {
      toast({
        title: 'Error starting review',
        description: error?.message || 'Failed to start review.',
        variant: 'destructive',
      })
    }
  }

  const filteredTasks = tasks.filter((task: any) => {
    if (!task || !task.title) return false
    const matchesSearch = task.title?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      task.author?.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      task.author?.email?.toLowerCase()?.includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const pendingTasks = tasks.filter((t: any) => t.state === 'SUBMITTED' || t.state === 'IN_REVIEW')
  const historyTasks = tasks.filter((t: any) =>
    t.state === 'APPROVED' || t.state === 'REJECTED' || t.state === 'CHANGES_REQUESTED'
  )

  if (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
      ? error 
      : 'An error occurred while loading tasks'
    
    return (
      <div className="w-full h-full px-8 py-6 overflow-y-auto">
        <div className="space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Review Queue", icon: <ClipboardCheck className="size-3.5 text-primary" /> }
            ]}
          />
          <Alert variant="destructive">
            <AlertDescription>Error: {errorMessage}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full px-8 py-6 overflow-y-auto">
      <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Review Queue", icon: <ClipboardCheck className="size-3.5 text-primary" /> }
        ]}
      />

      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'pending' | 'history')} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              All
              <Badge variant="secondary" className="text-xs ml-1">{tasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Pending
              <Badge variant="secondary" className="text-xs ml-1">{pendingTasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              Reviewed
              <Badge variant="secondary" className="text-xs ml-1">{historyTasks.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="!p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-7 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <div className="mx-auto w-10 h-10 rounded bg-secondary flex items-center justify-center mb-3">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">
              {tasks.length === 0 ? 'All caught up!' : 'No matching tasks'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tasks.length === 0
                ? 'There are no tasks awaiting review right now'
                : 'Try adjusting your search query'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredTasks.map((task: any) => {
            if (!task?.id) return null
            const taskState = task.state || 'SUBMITTED'
            const StateIcon = getStateIcon(taskState)
            const isPending = taskState === 'SUBMITTED' || taskState === 'IN_REVIEW'
            const isCompleted = taskState === 'APPROVED' || taskState === 'REJECTED' || taskState === 'CHANGES_REQUESTED'
            const canStartReview = taskState === 'SUBMITTED'

            return (
              <ContextMenu key={task.id}>
                <ContextMenuTrigger asChild>
                  <Link href={`/reviewer/tasks/${task.id}`}>
                    <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <CardContent className="!p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded bg-secondary flex items-center justify-center">
                            <StateIcon className={cn("h-4 w-4", getStateColor(taskState))} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm truncate">{task.title || 'Untitled'}</h3>
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getStateBadgeClass(taskState))}>
                                {taskState === 'SUBMITTED' ? 'Awaiting Review' : (taskState || '').replace('_', ' ')}
                              </Badge>
                              {task.difficulty && (
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getDifficultyBadgeClass(task.difficulty))}>
                                  {task.difficulty}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              {task.author && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  {task.author?.name || task.author?.email || 'Unknown'}
                                </span>
                              )}
                              {task.createdAt && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(task.createdAt).toLocaleDateString()}
                                </span>
                              )}
                              {task.reviews && task.reviews.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {task.reviews.length} review{task.reviews.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant={isCompleted ? "outline" : "default"}
                            className="flex-shrink-0 h-7 text-xs px-2"
                          >
                            {isCompleted ? 'View' : (taskState === 'IN_REVIEW' ? 'Continue' : 'Review')}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => router.push(`/reviewer/tasks/${task.id}`)}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    {isCompleted ? 'View Details' : 'Open Review'}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => window.open(`/reviewer/tasks/${task.id}`, '_blank')}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                  </ContextMenuItem>
                  
                  {canStartReview && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => handleStartReview(task.id)}>
                        <Play className="mr-2 h-4 w-4" />
                        Start Review
                      </ContextMenuItem>
                    </>
                  )}
                  
                  <ContextMenuSeparator />
                  
                  <ContextMenuItem onClick={() => handleCopyId(task.id)}>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy Task ID
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
