'use client'

/**
 * Task Detail Page
 * OPTIMIZED: Lazy loading and code splitting for faster initial load
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUserRole } from '@/contexts/user-role-context'
import { useTask, useSubmitTask } from '@/hooks/use-tasks'
import { canSubmitTask, canEditTask, TaskState } from '@repo/types'
import {
  getStateBadgeClass,
  getDifficultyBadgeClass,
  getDecisionIcon,
  getDecisionBadgeClass,
  getDecisionColor,
  getDecisionBgColor,
  getStateLabel,
  formatDate,
  formatDateTime,
} from '@/lib/ui-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
// OPTIMIZATION: Lazy load heavy components
const TaskFormModal = lazy(() => 
  import('@/components/modals').then(mod => ({ default: mod.TaskFormModal }))
)
const ConfirmModal = lazy(() => 
  import('@/components/modals').then(mod => ({ default: mod.ConfirmModal }))
)
const CodeBlock = lazy(() => 
  import('@/components/ui/code-block').then(mod => ({ default: mod.CodeBlock }))
)
const AuditTimeline = lazy(() => 
  import('@/components/ui/audit-timeline').then(mod => ({ default: mod.AuditTimeline }))
)
import { ActivitySidebar } from '@/components/activity-sidebar'
import { auditApi, type AuditLogEntry } from '@/lib/api-client'
import {
  ArrowLeft,
  Edit3,
  Send,
  Clock,
  Calendar,
  Timer,
  Tag,
  FileCode,
  MessageSquare,
  Info,
  CheckCircle2,
  History,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'

// Audit logs query key for invalidation
export const auditKeys = {
  task: (taskId: string) => ['audit', 'task', taskId] as const,
}


export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isReviewer } = useUserRole()
  const taskId = params.id as string
  const isTempTask = taskId.startsWith('temp-')

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)

  // All hooks must be called before any early returns (Rules of Hooks)
  const { data: task, isLoading, error } = useTask(taskId)
  const submitMutation = useSubmitTask(taskId)
  // Fetch audit logs with React Query for auto-refresh
  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({
    queryKey: auditKeys.task(taskId),
    queryFn: () => auditApi.getEntityLogs('task', taskId),
    enabled: !isTempTask && !!taskId && !isReviewer,
    staleTime: 0,
  })

  // Redirect reviewers to the reviewer view of this task
  useEffect(() => {
    if (isReviewer) {
      router.replace(`/reviewer/tasks/${taskId}`)
    }
  }, [isReviewer, router, taskId])

  // Redirect to tasks list if trying to access a temp task
  useEffect(() => {
    if (isTempTask) {
      router.push('/tasks')
    }
  }, [isTempTask, router])

  // Don't render creator content for reviewers
  if (isReviewer) {
    return null
  }

  const handleSubmit = () => {
    // Close modal immediately for instant feedback
    setIsSubmitModalOpen(false)
    
    submitMutation.mutate(undefined, {
      onError: () => {
        // Reopen modal on error
        setIsSubmitModalOpen(true)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="w-full h-full px-8 py-6 overflow-y-auto">
        <div className="space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Tasks", href: "/tasks", icon: <FileText className="size-3.5 text-primary" /> },
              { label: "Loading..." }
            ]}
          />
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-7 w-1/3" />
                <Skeleton className="h-4 w-1/4 mt-2" />
              </div>
            </div>
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full px-8 py-6 overflow-y-auto">
        <div className="space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Tasks", href: "/tasks", icon: <FileText className="size-3.5 text-primary" /> },
              { label: "Error" }
            ]}
          />
          <Alert variant="destructive">
            <AlertDescription>Error loading task: {(error as Error).message}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="w-full h-full px-8 py-6 overflow-y-auto">
        <div className="space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Tasks", href: "/tasks", icon: <FileText className="size-3.5 text-primary" /> },
              { label: "Not Found" }
            ]}
          />
          <Alert>
            <AlertDescription>Task not found</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const canEdit = task.state ? canEditTask(task.state) : false
  const canSubmit = task.state ? canSubmitTask(task.state) : false

  const files = [
    { name: 'task.yaml', content: task.taskYaml },
    { name: 'docker-compose.yaml', content: task.dockerComposeYaml },
    { name: 'solution.sh', content: task.solutionSh },
    { name: 'run-tests.sh', content: task.runTestsSh },
    { name: 'tests.json', content: task.testsJson },
  ].filter((f) => f.content)

  // Always show the activity sidebar for tasks (it shows creation history too)

  return (
    <div className="flex flex-1 h-full min-h-0">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="w-full px-8 py-6">
        <div className="space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Tasks", href: "/tasks", icon: <FileText className="size-3.5 text-primary" /> },
              { label: task.title }
            ]}
            actions={
              <div className="flex gap-2">
                {canEdit && (
                  <Button variant="outline" onClick={() => setIsEditModalOpen(true)} className="gap-2">
                    <Edit3 className="size-4" />
                    Edit
                  </Button>
                )}
                {canSubmit && (
                  <Button onClick={() => setIsSubmitModalOpen(true)} className="gap-2">
                    <Send className="size-4" />
                    Submit for Review
                  </Button>
                )}
              </div>
            }
          />
          <div className="space-y-6">
        {/* Task Metadata */}
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="outline" className={cn('text-xs', task.state ? getStateBadgeClass(task.state) : '')}>
            {task.state ? getStateLabel(task.state) : 'Unknown'}
          </Badge>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Created {formatDate(task.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Updated {formatDate(task.updatedAt)}
            </span>
          </div>
        </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 bg-secondary/30">
          <TabsTrigger value="overview" className="gap-2">
            <Info className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="instruction" className="gap-2">
            <MessageSquare className="size-4" />
            Instruction
          </TabsTrigger>
          {files.length > 0 && (
            <TabsTrigger value="files" className="gap-2">
              <FileCode className="size-4" />
              Files ({files.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Task Details */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Info className="size-4 text-muted-foreground" />
                  Task Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Difficulty
                    </p>
                    <Badge variant="outline" className={cn(getDifficultyBadgeClass(task.difficulty))}>
                      {task.difficulty}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Categories
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Tag className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">{task.categories}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeouts */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Timer className="size-4 text-muted-foreground" />
                  Execution Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Agent Timeout
                    </p>
                    <p className="text-xl font-semibold">{task.maxAgentTimeoutSec}s</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Test Timeout
                    </p>
                    <p className="text-xl font-semibold">{task.maxTestTimeoutSec}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="instruction" className="mt-0">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <MessageSquare className="size-4 text-muted-foreground" />
                Agent Instruction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] rounded-lg border border-border/50 bg-secondary/20 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{task.instruction}</p>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-0">
          <div className="space-y-6">
            <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
              {files.map((file) => (
                <div key={file.name}>
                  <CodeBlock content={file.content!} filename={file.name} />
                </div>
              ))}
            </Suspense>
          </div>
        </TabsContent>

      </Tabs>

        {/* OPTIMIZATION: Lazy-load modals */}
        <Suspense fallback={null}>
          <TaskFormModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} task={task} />
        </Suspense>

        <Suspense fallback={null}>
          <ConfirmModal
            open={isSubmitModalOpen}
            onOpenChange={setIsSubmitModalOpen}
            title="Submit for Review"
            description="Are you sure you want to submit this task for review? Once submitted, you won't be able to edit it until a reviewer responds."
            confirmText="Submit"
            variant="warning"
            isLoading={submitMutation.isPending}
            onConfirm={handleSubmit}
          />
        </Suspense>
          </div>
        </div>
        </div>
      </div>

      {/* Activity Sidebar */}
      <ActivitySidebar
        taskId={taskId}
        reviews={(task.reviews || []).map(r => ({
          ...r,
          createdAt: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString()
        }))}
        auditLogs={auditLogs}
        taskState={task.state || ''}
        isLoading={loadingAudit}
      />
    </div>
  )
}
