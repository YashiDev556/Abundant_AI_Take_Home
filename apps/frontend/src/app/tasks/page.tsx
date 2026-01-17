'use client'

/**
 * Tasks List Page
 * Displays all tasks created by the current user with filtering
 */

import { useState } from 'react'
import Link from 'next/link'
import { useTasks } from '@/hooks/use-tasks'
import { Task, TaskState, Difficulty } from '@repo/types'
import {
  getStateBadgeClass,
  getDifficultyBadgeClass,
  getStateIcon,
  formatDate,
  formatCount,
} from '@/lib/ui-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskFormModal } from '@/components/modals'
import {
  PlusCircle,
  Search,
  FileText,
  Calendar,
  Tag,
  ArrowRight,
  Filter,
  SortDesc,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TasksPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterState, setFilterState] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')

  const { data: tasks = [], isLoading, error } = useTasks()

  // Filter tasks
  const filteredTasks = tasks.filter((task: Task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.instruction?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesState = filterState === 'all' || task.state === filterState
    const matchesDifficulty = filterDifficulty === 'all' || task.difficulty === filterDifficulty
    return matchesSearch && matchesState && matchesDifficulty
  })

  if (error) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
            <p className="text-muted-foreground mt-1">Manage and track your submitted tasks</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Error loading tasks: {(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {formatCount(filteredTasks.length, 'task')}
            {filterState !== 'all' || filterDifficulty !== 'all' ? ' (filtered)' : ''}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <PlusCircle className="size-4" />
          Create New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterState} onValueChange={setFilterState}>
          <SelectTrigger className="w-[160px]">
            <Filter className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(TaskState).map((state) => (
              <SelectItem key={state} value={state}>
                {state.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-[140px]">
            <SortDesc className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {Object.values(Difficulty).map((difficulty) => (
              <SelectItem key={difficulty} value={difficulty}>
                {difficulty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
              <FileText className="size-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">
              {tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {tasks.length === 0
                ? 'Get started by creating your first benchmark task'
                : 'Try adjusting your filters or search query'}
            </p>
            {tasks.length === 0 && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusCircle className="size-4 mr-2" />
                Create Your First Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task, index) => {
            const StateIcon = getStateIcon(task.state)
            return (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <Card
                  className={cn(
                    'border-border/50 hover:border-primary/30 transition-all cursor-pointer',
                    'hover:bg-secondary/20 group animate-slide-up'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <StateIcon
                          className={cn(
                            'size-6',
                            task.state === TaskState.APPROVED && 'text-emerald-500',
                            task.state === TaskState.REJECTED && 'text-red-500',
                            task.state === TaskState.CHANGES_REQUESTED && 'text-orange-500',
                            task.state === TaskState.SUBMITTED && 'text-amber-500',
                            task.state === TaskState.IN_REVIEW && 'text-blue-500',
                            task.state === TaskState.DRAFT && 'text-muted-foreground'
                          )}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                              {task.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {task.instruction?.substring(0, 150)}
                              {task.instruction?.length > 150 ? '...' : ''}
                            </p>
                          </div>
                          <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <Badge
                            variant="outline"
                            className={cn('text-xs', getStateBadgeClass(task.state))}
                          >
                            {task.state.replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn('text-xs', getDifficultyBadgeClass(task.difficulty))}
                          >
                            {task.difficulty}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Tag className="size-3" />
                            {task.categories}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="size-3" />
                            {formatDate(task.createdAt)}
                          </div>
                        </div>

                        {/* Review info */}
                        {task.reviews && task.reviews.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs text-muted-foreground">
                              Latest review:{' '}
                              <span className="font-medium text-foreground">
                                {task.reviews[0].decision}
                              </span>
                              {task.reviews[0].comment && (
                                <span className="ml-1">
                                  — {task.reviews[0].comment.substring(0, 60)}...
                                </span>
                              )}
                            </p>
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

      <TaskFormModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  )
}
