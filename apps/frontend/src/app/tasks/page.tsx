'use client'

import { useState, useMemo, lazy, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/contexts/user-role-context'
import { useTasks, taskKeys, useDuplicateTask } from '@/hooks/use-tasks'
import { canEditTask, canSubmitTask } from '@repo/types'
import { api } from '@/lib/api-client'
import { useQueryClient } from '@tanstack/react-query'
import { usePrefetchTask } from '@/hooks/use-prefetch'
import { TaskState, Difficulty } from '@repo/types'
import type { Task } from '@repo/types'
import {
  getStateBadgeClass,
  getDifficultyBadgeClass,
  getStateIcon,
  getStateLabel,
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Plus,
  Search,
  FileText,
  Calendar,
  Tag,
  ArrowRight,
  Trash2,
  Copy,
  Edit3,
  Send,
  ExternalLink,
  ClipboardCopy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { useToast } from '@/hooks/use-toast'

const TaskFormModal = lazy(() =>
  import('@/components/modals').then(mod => ({ default: mod.TaskFormModal }))
)
const ConfirmModal = lazy(() =>
  import('@/components/modals').then(mod => ({ default: mod.ConfirmModal }))
)

export default function TasksPage() {
  const router = useRouter()
  const { isReviewer } = useUserRole()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterState, setFilterState] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const prefetchTask = usePrefetchTask()

  const { data: tasks = [], isLoading, error } = useTasks()

  // All hooks must be called before any early returns (Rules of Hooks)
  const filteredTasks = useMemo(() => {
    const searchLower = searchQuery.toLowerCase()
    return tasks.filter((task: Task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchLower) ||
        task.instruction?.toLowerCase().includes(searchLower)
      const matchesState = filterState === 'all' || task.state === filterState
      const matchesDifficulty = filterDifficulty === 'all' || task.difficulty === filterDifficulty
      return matchesSearch && matchesState && matchesDifficulty
    })
  }, [tasks, searchQuery, filterState, filterDifficulty])

  // Redirect reviewers to their dashboard
  useEffect(() => {
    if (isReviewer) {
      router.replace('/reviewer')
    }
  }, [isReviewer, router])

  // Don't render creator content for reviewers
  if (isReviewer) {
    return null
  }

  const handleDeleteClick = (taskId: string) => {
    setDeleteTaskId(taskId)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTaskId) return
    
    const taskIdToDelete = deleteTaskId
    setIsDeleting(true)
    
    try {
      await api.tasks.delete(taskIdToDelete)
      
      // Optimistically remove from cache
      queryClient.setQueriesData<Task[]>(
        { queryKey: taskKeys.lists() },
        (old = []) => old.filter((task) => task.id !== taskIdToDelete)
      )
      queryClient.removeQueries({ queryKey: taskKeys.detail(taskIdToDelete) })
      
      toast({
        title: 'Task deleted',
        description: 'The task has been successfully deleted.',
      })
      setDeleteTaskId(null)
      
      // If we're on the detail page of the deleted task, redirect to list
      if (window.location.pathname.includes(`/tasks/${taskIdToDelete}`)) {
        router.push('/tasks')
      }
      
      // Invalidate queries to ensure sync
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    } catch (error: any) {
      toast({
        title: 'Error deleting task',
        description: error?.message || 'Failed to delete task. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Duplicate task handler
  const duplicateMutation = useDuplicateTask()
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null

  const handleDuplicate = async (taskId: string) => {
    try {
      const newTask = await duplicateMutation.mutateAsync(taskId)
      toast({
        title: 'Task duplicated',
        description: 'A copy of the task has been created.',
      })
      router.push(`/tasks/${newTask.id}`)
    } catch (error: any) {
      toast({
        title: 'Error duplicating task',
        description: error?.message || 'Failed to duplicate task. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleCopyId = (taskId: string) => {
    navigator.clipboard.writeText(taskId)
    toast({
      title: 'Task ID copied',
      description: 'Task ID has been copied to clipboard.',
    })
  }

  const handleSubmit = async (taskId: string) => {
    try {
      await api.tasks.submit(taskId)
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      toast({
        title: 'Task submitted',
        description: 'Your task has been submitted for review.',
      })
    } catch (error: any) {
      toast({
        title: 'Error submitting task',
        description: error?.message || 'Failed to submit task. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (error) {
    return (
      <div className="w-full h-full px-8 py-6 overflow-y-auto">
        <div className="space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Tasks", icon: <FileText className="size-3.5 text-primary" /> }
            ]}
          />
          <Alert variant="destructive">
            <AlertDescription>Error loading tasks: {(error as Error).message}</AlertDescription>
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
          { label: "Tasks", icon: <FileText className="size-3.5 text-primary" /> }
        ]}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterState} onValueChange={setFilterState}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(TaskState).map((state) => (
              <SelectItem key={state} value={state}>
                {getStateLabel(state)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-[130px]">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <div className="mx-auto w-10 h-10 rounded bg-secondary flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">
              {tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {tasks.length === 0
                ? 'Get started by creating your first benchmark task'
                : 'Try adjusting your filters or search query'}
            </p>
            {tasks.length === 0 && (
              <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredTasks.map((task) => {
            const StateIcon = getStateIcon(task.state)
            const isTempTask = task.id.startsWith('temp-')
            const canDelete = task.state === TaskState.DRAFT || task.state === TaskState.REJECTED
            
            return (
              <ContextMenu key={task.id}>
                <ContextMenuTrigger asChild>
                  <Link
                    href={isTempTask ? '#' : `/tasks/${task.id}`}
                    onMouseEnter={() => !isTempTask && prefetchTask(task.id)}
                    onClick={(e) => isTempTask && e.preventDefault()}
                  >
                    <Card
                      className={cn(
                        'hover:bg-secondary/50 transition-colors',
                        !isTempTask && 'cursor-pointer',
                        isTempTask && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <CardContent className="!p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded bg-secondary flex items-center justify-center">
                            <StateIcon
                              className={cn(
                                'h-4 w-4',
                                task.state === TaskState.APPROVED && 'text-emerald-500',
                                task.state === TaskState.REJECTED && 'text-red-500',
                                task.state === TaskState.CHANGES_REQUESTED && 'text-orange-500',
                                task.state === TaskState.SUBMITTED && 'text-amber-500',
                                task.state === TaskState.IN_REVIEW && 'text-blue-500',
                                task.state === TaskState.DRAFT && 'text-muted-foreground'
                              )}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm truncate">{task.title}</h3>
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getStateBadgeClass(task.state))}>
                                {getStateLabel(task.state)}
                              </Badge>
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getDifficultyBadgeClass(task.difficulty))}>
                                {task.difficulty}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Tag className="h-3 w-3" />
                                {task.categories}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(task.createdAt)}
                              </span>
                            </div>
                          </div>

                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {/* View Details */}
                  <ContextMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      router.push(`/tasks/${task.id}`)
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Details
                  </ContextMenuItem>
                  
                  <ContextMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      window.open(`/tasks/${task.id}`, '_blank')
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                  </ContextMenuItem>

                  <ContextMenuSeparator />
                  
                  {/* Edit (if editable) */}
                  {canEditTask(task.state as TaskState) && (
                    <ContextMenuItem
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditTaskId(task.id)
                      }}
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Task
                    </ContextMenuItem>
                  )}
                  
                  {/* Submit (if submittable) */}
                  {canSubmitTask(task.state as TaskState) && (
                    <ContextMenuItem
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleSubmit(task.id)
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Submit for Review
                    </ContextMenuItem>
                  )}
                  
                  {/* Duplicate */}
                  <ContextMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDuplicate(task.id)
                    }}
                    disabled={duplicateMutation.isPending}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate Task
                  </ContextMenuItem>

                  <ContextMenuSeparator />
                  
                  {/* Copy Task ID */}
                  <ContextMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleCopyId(task.id)
                    }}
                  >
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy Task ID
                  </ContextMenuItem>

                  {/* Delete (if deletable) */}
                  {canDelete && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteClick(task.id)
                        }}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Task
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>
      )}

        <Suspense fallback={null}>
          <TaskFormModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
          {editTask && (
            <TaskFormModal
              open={!!editTaskId}
              onOpenChange={(open) => !open && setEditTaskId(null)}
              task={editTask}
            />
          )}
          {deleteTaskId && (
            <ConfirmModal
              open={!!deleteTaskId}
              onOpenChange={(open) => !open && setDeleteTaskId(null)}
              title="Delete Task"
              description={`Are you sure you want to delete "${tasks.find(t => t.id === deleteTaskId)?.title || 'this task'}"? This action cannot be undone.`}
              confirmText="Delete"
              cancelText="Cancel"
              variant="destructive"
              isLoading={isDeleting}
              onConfirm={handleDeleteConfirm}
            />
          )}
        </Suspense>
      </div>
    </div>
  )
}
