'use client'

/**
 * Task Detail Page
 * Displays detailed information about a specific task
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTask, useSubmitTask } from '@/hooks/use-tasks'
import { canSubmitTask, canEditTask, ReviewDecision } from '@repo/types'
import {
  getStateBadgeClass,
  getDifficultyBadgeClass,
  getDecisionIcon,
  getDecisionBadgeClass,
  getDecisionColor,
  getDecisionBgColor,
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
import { TaskFormModal, ConfirmModal } from '@/components/modals'
import { CodeBlock } from '@/components/ui/code-block'
import { AuditTimeline } from '@/components/ui/audit-timeline'
import { DiffViewer } from '@/components/ui/diff-viewer'
import { auditApi, type AuditLogEntry, type TaskDiff } from '@/lib/api-client'
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
  GitCompare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function useFetchData() {
  const { id } = useParams()
  const taskId = typeof id === 'string' ? id : id?.[0] || ''
  
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [latestDiff, setLatestDiff] = useState<TaskDiff | null>(null)
  const [loadingAudit, setLoadingAudit] = useState(true)
  const [loadingDiff, setLoadingDiff] = useState(true)

  useEffect(() => {
    async function fetchAuditData() {
      if (!taskId) return
      
      setLoadingAudit(true)
      try {
        const logs = await auditApi.getEntityLogs('task', taskId)
        setAuditLogs(logs)
      } catch (error) {
        console.error('Failed to fetch audit logs:', error)
      } finally {
        setLoadingAudit(false)
      }
    }

    async function fetchDiffData() {
      if (!taskId) return
      
      setLoadingDiff(true)
      try {
        const diff = await auditApi.getLatestTaskDiff(taskId)
        setLatestDiff(diff)
      } catch (error) {
        console.error('Failed to fetch diff:', error)
      } finally {
        setLoadingDiff(false)
      }
    }

    fetchAuditData()
    fetchDiffData()
  }, [taskId])

  return { auditLogs, latestDiff, loadingAudit, loadingDiff }
}


export default function TaskDetailPage() {
  const params = useParams()
  const taskId = params.id as string

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)

  const { data: task, isLoading, error } = useTask(taskId)
  const submitMutation = useSubmitTask(taskId)
  const { auditLogs, latestDiff, loadingAudit, loadingDiff } = useFetchData()

  const handleSubmit = () => {
    submitMutation.mutate(undefined, {
      onSuccess: () => {
        setIsSubmitModalOpen(false)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/4 mt-2" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertDescription>Error loading task: {(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="py-6">
        <Alert>
          <AlertDescription>Task not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  const canEdit = canEditTask(task.state)
  const canSubmit = canSubmitTask(task.state)

  const files = [
    { name: 'task.yaml', content: task.taskYaml },
    { name: 'docker-compose.yaml', content: task.dockerComposeYaml },
    { name: 'solution.sh', content: task.solutionSh },
    { name: 'run-tests.sh', content: task.runTestsSh },
    { name: 'tests.json', content: task.testsJson },
  ].filter((f) => f.content)

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/tasks">
            <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
              <Badge variant="outline" className={cn('text-xs', getStateBadgeClass(task.state))}>
                {task.state.replace('_', ' ')}
              </Badge>
            </div>
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
        </div>

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
          {task.reviews && task.reviews.length > 0 && (
            <TabsTrigger value="reviews" className="gap-2">
              <CheckCircle2 className="size-4" />
              Reviews ({task.reviews.length})
            </TabsTrigger>
          )}
          {latestDiff && (
            <TabsTrigger value="changes" className="gap-2">
              <GitCompare className="size-4" />
              Changes
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-2">
            <History className="size-4" />
            History
          </TabsTrigger>
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
            {files.map((file) => (
              <div key={file.name}>
                <CodeBlock content={file.content!} filename={file.name} />
              </div>
            ))}
          </div>
        </TabsContent>

        {task.reviews && task.reviews.length > 0 && (
          <TabsContent value="reviews" className="mt-0">
            <div className="space-y-4">
              {task.reviews.map((review, index) => {
                const DecisionIcon = getDecisionIcon(review.decision)
                const decisionColor = getDecisionColor(review.decision)
                const decisionBg = getDecisionBgColor(review.decision)

                return (
                  <Card
                    key={review.id}
                    className={cn('border-border/50 animate-slide-up')}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', decisionBg)}>
                          <DecisionIcon className={cn('size-5', decisionColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-medium">
                                {review.reviewer?.name || review.reviewer?.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(review.createdAt)}
                              </p>
                            </div>
                            <Badge variant="outline" className={cn(getDecisionBadgeClass(review.decision))}>
                              {review.decision.replace('_', ' ')}
                            </Badge>
                          </div>
                          {review.comment && (
                            <p className="mt-3 text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        )}

        {/* Changes Tab */}
        {latestDiff && (
          <TabsContent value="changes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="size-5" />
                  Recent Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDiff ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <DiffViewer
                    changes={latestDiff.changes}
                    fromVersion={latestDiff.fromVersion}
                    toVersion={latestDiff.toVersion}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5" />
                Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAudit ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <AuditTimeline logs={auditLogs} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <TaskFormModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} task={task} />

      {/* Submit Confirmation Modal */}
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
    </div>
  )
}
