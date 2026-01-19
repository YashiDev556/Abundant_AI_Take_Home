"use client"

import { useState, lazy, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SignedIn, SignedOut, SignIn } from '@clerk/nextjs'
import { useUserRole } from '@/contexts/user-role-context'
import { useTasks, useDuplicateTask, taskKeys } from '@/hooks/use-tasks'
import { usePrefetchTask } from '@/hooks/use-prefetch'
import { useQueryClient } from '@tanstack/react-query'
import { TaskState, canEditTask, canSubmitTask, getStateLabel } from '@repo/types'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const TaskFormModal = lazy(() =>
  import('@/components/modals').then(mod => ({ default: mod.TaskFormModal }))
)
const ConfirmModal = lazy(() =>
  import('@/components/modals').then(mod => ({ default: mod.ConfirmModal }))
)
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  FileText,
  Plus,
  Clock,
  ArrowRight,
  Terminal,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Copy,
  Edit3,
  Send,
  ExternalLink,
  ClipboardCopy,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { useToast } from '@/hooks/use-toast'

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
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const prefetchTask = usePrefetchTask()
  const duplicateMutation = useDuplicateTask()

  const { data: tasks = [], isLoading } = useTasks({ limit: 20 })
  const editTask = editTaskId ? tasks.find((t: any) => t.id === editTaskId) : null

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
        description: error?.message || 'Failed to duplicate task.',
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
        description: error?.message || 'Failed to submit task.',
        variant: 'destructive',
      })
    }
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
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      toast({
        title: 'Task deleted',
        description: 'The task has been successfully deleted.',
      })
      setDeleteTaskId(null)
    } catch (error: any) {
      toast({
        title: 'Error deleting task',
        description: error?.message || 'Failed to delete task.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t: any) => ['SUBMITTED', 'IN_REVIEW'].includes(t.state)).length,
    approved: tasks.filter((t: any) => t.state === 'APPROVED').length,
    needsWork: tasks.filter((t: any) => ['REJECTED', 'CHANGES_REQUESTED'].includes(t.state)).length,
  }

  const recentTasks = tasks.slice(0, 5)

  return (
    <div className="w-full h-full px-8 py-6 overflow-y-auto">
      <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", icon: <LayoutDashboard className="size-3.5 text-primary" /> }
        ]}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-7 w-10" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold mt-1">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <p className="text-2xl font-semibold mt-1">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
                <p className="text-2xl font-semibold mt-1">{stats.approved}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                  <p className="text-sm text-muted-foreground">Needs Work</p>
                </div>
                <p className="text-2xl font-semibold mt-1">{stats.needsWork}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Recent Tasks</h2>
          <Link href="/tasks">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="!p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentTasks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <div className="mx-auto w-10 h-10 rounded bg-secondary flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No tasks yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first task to get started</p>
              <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {recentTasks.map((task: any) => {
              const isTempTask = task.id?.startsWith('temp-')
              const canEdit = canEditTask(task.state as TaskState)
              const canSubmit = canSubmitTask(task.state as TaskState)
              const canDelete = task.state === 'DRAFT' || task.state === 'REJECTED'
              
              return (
                <ContextMenu key={task.id}>
                  <ContextMenuTrigger asChild>
                    <Link
                      href={isTempTask ? '#' : `/tasks/${task.id}`}
                      onMouseEnter={() => !isTempTask && prefetchTask(task.id)}
                      onClick={(e) => isTempTask && e.preventDefault()}
                    >
                      <Card className={cn(
                        "hover:bg-secondary/50 transition-colors",
                        !isTempTask && "cursor-pointer",
                        isTempTask && "opacity-50 cursor-not-allowed"
                      )}>
                        <CardContent className="!p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded bg-secondary flex items-center justify-center">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm truncate">{task.title}</h3>
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getStateBadgeClass(task.state))}>
                                  {getStateLabel(task.state as TaskState)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {task.difficulty} · {new Date(task.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {!isTempTask && (
                      <>
                        <ContextMenuItem onClick={() => router.push(`/tasks/${task.id}`)}>
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => window.open(`/tasks/${task.id}`, '_blank')}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open in New Tab
                        </ContextMenuItem>
                        
                        <ContextMenuSeparator />
                        
                        {canEdit && (
                          <ContextMenuItem onClick={() => setEditTaskId(task.id)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit Task
                          </ContextMenuItem>
                        )}
                        
                        {canSubmit && (
                          <ContextMenuItem onClick={() => handleSubmit(task.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Submit for Review
                          </ContextMenuItem>
                        )}
                        
                        <ContextMenuItem onClick={() => handleDuplicate(task.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate Task
                        </ContextMenuItem>
                        
                        <ContextMenuSeparator />
                        
                        <ContextMenuItem onClick={() => handleCopyId(task.id)}>
                          <ClipboardCopy className="mr-2 h-4 w-4" />
                          Copy Task ID
                        </ContextMenuItem>
                      </>
                    )}
                    
                    {isTempTask && (
                      <ContextMenuItem disabled>
                        <FileText className="mr-2 h-4 w-4" />
                        Creating task...
                      </ContextMenuItem>
                    )}
                    
                    {!isTempTask && canDelete && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => handleDeleteClick(task.id)}
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
      </div>

        <Suspense fallback={null}>
          <TaskFormModal
            open={isCreateModalOpen}
            onOpenChange={setIsCreateModalOpen}
            onSuccess={() => {}}
          />
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
              description={`Are you sure you want to delete "${tasks.find((t: any) => t.id === deleteTaskId)?.title || 'this task'}"? This action cannot be undone.`}
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

export default function HomePage() {
  const router = useRouter()
  const { isReviewer } = useUserRole()

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

  return (
    <>
      <SignedOut>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-lg bg-foreground text-background flex items-center justify-center">
                <Terminal className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Terminal-Bench</h1>
                <p className="text-foreground mt-1">Task Review Platform</p>
              </div>
            </div>

            <div className="flex justify-center">
              <SignIn
                appearance={{
                  elements: {
                    rootBox: "mx-auto",
                    card: "bg-card border border-border shadow-sm rounded-lg",
                    headerTitle: "text-foreground",
                    headerSubtitle: "text-muted-foreground",
                    socialButtonsBlockButton: "bg-secondary hover:bg-secondary/80 border-border text-white",
                    socialButtonsBlockButtonText: "text-white",
                    formButtonPrimary: "bg-primary hover:bg-primary/90 text-black",
                    footerActionLink: "text-foreground hover:text-foreground/80",
                    formFieldInput: "bg-background border-border focus:ring-ring text-foreground placeholder:text-muted-foreground",
                    formFieldLabel: "text-foreground",
                    formFieldErrorText: "text-destructive",
                    formFieldHintText: "text-muted-foreground",
                    dividerLine: "bg-border",
                    dividerText: "text-muted-foreground",
                    formResendCodeLink: "text-foreground",
                    identityPreviewText: "text-foreground",
                    identityPreviewEditButton: "text-foreground",
                    formButtonReset: "text-foreground",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <CreatorDashboard />
      </SignedIn>
    </>
  )
}
