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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const getStateBadgeClass = (state: string) => {
  const classes: Record<string, string> = {
    SUBMITTED: 'badge-submitted',
    IN_REVIEW: 'badge-in-review',
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

export default function ReviewerDashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['reviewer', 'tasks', 'all'],
    queryFn: () => reviewerApi.listTasks(),
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  // Filter and categorize tasks
  const filteredTasks = tasks.filter((task: any) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.author?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.author?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'submitted' && task.state === 'SUBMITTED') ||
      (activeTab === 'in-review' && task.state === 'IN_REVIEW')
    return matchesSearch && matchesTab
  })

  const submittedCount = tasks.filter((t: any) => t.state === 'SUBMITTED').length
  const inReviewCount = tasks.filter((t: any) => t.state === 'IN_REVIEW').length

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
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-secondary/30">
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="ml-1 text-xs">{tasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="submitted" className="gap-2">
              <Clock className="size-3.5" />
              Awaiting
              <Badge variant="secondary" className="ml-1 text-xs bg-amber-500/20 text-amber-400">{submittedCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="in-review" className="gap-2">
              <Timer className="size-3.5" />
              In Progress
              <Badge variant="secondary" className="ml-1 text-xs bg-blue-500/20 text-blue-400">{inReviewCount}</Badge>
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
          {filteredTasks.map((task: any, index: number) => (
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
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center group-hover:bg-teal-500/10 transition-colors">
                      <FileText className={cn(
                        "size-6",
                        task.state === 'IN_REVIEW' ? 'text-blue-500' : 'text-amber-500'
                      )} />
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
                          className={cn(
                            "flex-shrink-0",
                            task.state === 'IN_REVIEW'
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-teal-600 hover:bg-teal-700"
                          )}
                        >
                          {task.state === 'IN_REVIEW' ? 'Continue' : 'Review'}
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
                            {task.reviews.length} previous review{task.reviews.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
