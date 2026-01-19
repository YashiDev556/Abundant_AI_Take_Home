'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { reviewerApi, api, auditApi } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConfirmModal } from '@/components/modals'
import { ReviewSidebar } from '@/components/review-sidebar'
import { ActivitySidebar } from '@/components/activity-sidebar'
import { DiffViewer } from '@/components/ui/diff-viewer'
import {
  ArrowLeft,
  Play,
  MessageSquare,
  Clock,
  Calendar,
  Timer,
  Tag,
  FileCode,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Copy,
  Check,
  ClipboardCheck,
  GitCompare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'

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

function CodeBlock({ content, filename }: { content: string; filename: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 border-b border-border/50">
        <span className="text-sm font-mono text-muted-foreground">{filename}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          className="h-7 w-7"
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      <ScrollArea className="h-[300px]">
        <pre className="p-4 text-sm font-mono leading-relaxed">
          <code className="text-muted-foreground">{content}</code>
        </pre>
      </ScrollArea>
    </div>
  )
}

export default function ReviewerTaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const taskId = params.id as string

  const [isStartReviewModalOpen, setIsStartReviewModalOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['reviewer', 'tasks', taskId],
    queryFn: () => reviewerApi.getTask(taskId),
  })

  // Fetch the latest diff (changes since last review)
  const { data: diffData, isLoading: isDiffLoading } = useQuery({
    queryKey: ['reviewer', 'tasks', taskId, 'diff'],
    queryFn: () => api.audit.getLatestTaskDiff(taskId),
    enabled: !!data, // Only fetch when task is loaded
  })

  // Fetch audit logs for activity sidebar
  const { data: auditLogs = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ['audit', 'task', taskId],
    queryFn: () => auditApi.getEntityLogs('task', taskId),
    enabled: !!data,
  })

  const startReviewMutation = useMutation({
    mutationFn: () => reviewerApi.startReview(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewer', 'tasks', taskId] })
      queryClient.invalidateQueries({ queryKey: ['reviewer', 'tasks'] })
      setIsStartReviewModalOpen(false)
    },
  })

  if (isLoading) {
    return (
      <div className="w-full h-full px-8 py-6 overflow-y-auto">
        <div className="space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Review Queue", href: "/reviewer", icon: <ClipboardCheck className="size-3.5 text-primary" /> },
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
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
      ? error 
      : 'An error occurred while loading the task'
    
    return (
      <div className="w-full h-full px-8 py-6 overflow-y-auto">
        <div className="space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Review Queue", href: "/reviewer", icon: <ClipboardCheck className="size-3.5 text-primary" /> },
              { label: "Error" }
            ]}
          />
          <Alert variant="destructive">
            <AlertDescription>Error loading task: {errorMessage}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const task = data
  if (!task) {
    return (
      <div className="w-full h-full px-8 py-6 overflow-y-auto">
        <div className="space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Review Queue", href: "/reviewer", icon: <ClipboardCheck className="size-3.5 text-primary" /> },
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

  const canStartReview = task.state === 'SUBMITTED'
  const canReview = ['IN_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(task.state)
  
  // Only pre-fill when editing a decision on the SAME version (not after resubmission)
  // If task is IN_REVIEW or SUBMITTED, it's a fresh review cycle - don't pre-fill
  const isEditingExistingDecision = ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(task.state)
  const latestReview = isEditingExistingDecision && task.reviews && task.reviews.length > 0 
    ? task.reviews[0] 
    : null
  const hasChanges = diffData && diffData.changes && diffData.changes.length > 0
  const isResubmission = hasChanges && (task.state === 'SUBMITTED' || task.state === 'IN_REVIEW')

  const files = [
    { name: 'task.yaml', content: task.taskYaml },
    { name: 'docker-compose.yaml', content: task.dockerComposeYaml },
    { name: 'solution.sh', content: task.solutionSh },
    { name: 'run-tests.sh', content: task.runTestsSh },
    { name: 'tests.json', content: task.testsJson },
  ].filter((f): f is { name: string; content: string } => f.content !== null && f.content !== undefined)

  return (
    <div className="flex flex-1 h-full min-h-0">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="w-full px-8 py-6">
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Review Queue", href: "/reviewer", icon: <ClipboardCheck className="size-3.5 text-primary" /> },
          { label: task.title }
        ]}
        actions={
              canStartReview ? (
              <Button
                onClick={() => setIsStartReviewModalOpen(true)}
                className="gap-2 bg-teal-600 hover:bg-teal-700"
              >
                <Play className="size-4" />
                Start Review
              </Button>
              ) : undefined
        }
      />
      <div className="space-y-6">
        {/* Task Metadata */}
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="outline" className={cn("text-xs", getStateBadgeClass(task.state || ''))}>
            {task.state === 'SUBMITTED' ? 'Awaiting Review' : (task.state || '').replace('_', ' ')}
          </Badge>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {task.author && (
              <span className="flex items-center gap-1.5">
                <User className="size-3.5" />
                <span className="text-muted-foreground/70">Created by</span> {task.author?.name || task.author?.email || 'Unknown'}
              </span>
            )}
            {task.createdAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {new Date(task.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

      {/* Resubmission Banner - Shows when task has changes from previous review */}
      {isResubmission && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10">
            <GitCompare className="size-5 text-teal-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-teal-400">Resubmission with Changes</p>
            <p className="text-sm text-muted-foreground">
              The author has made {diffData?.changes.length} change{diffData?.changes.length !== 1 ? 's' : ''} since the last review. 
              Check the "Changes" tab to see what was updated.
            </p>
          </div>
        </div>
      )}

      {/* Status Banner for IN_REVIEW */}
      {task.state === 'IN_REVIEW' && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Timer className="size-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-blue-400">Review in Progress</p>
            <p className="text-sm text-muted-foreground">
              You are currently reviewing this task. Use the panel on the right to submit your decision.
            </p>
          </div>
        </div>
      )}

      {/* Status Banner for APPROVED */}
      {task.state === 'APPROVED' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <CheckCircle2 className="size-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-emerald-400">Task Approved</p>
            <p className="text-sm text-muted-foreground">
              This task has been approved and is ready for use.
            </p>
          </div>
        </div>
      )}

      {/* Status Banner for REJECTED */}
      {task.state === 'REJECTED' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <XCircle className="size-5 text-red-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-red-400">Task Rejected</p>
            <p className="text-sm text-muted-foreground">
              This task has been rejected. The author may resubmit with changes.
            </p>
          </div>
        </div>
      )}

      {/* Status Banner for CHANGES_REQUESTED */}
      {task.state === 'CHANGES_REQUESTED' && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <AlertTriangle className="size-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-orange-400">Changes Requested</p>
            <p className="text-sm text-muted-foreground">
              Changes have been requested. Waiting for the author to update and resubmit.
            </p>
          </div>
        </div>
      )}

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
          {diffData && (
            <TabsTrigger value="changes" className="gap-2">
              <GitCompare className="size-4" />
              Changes
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid md:grid-cols-2 gap-6">
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
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Difficulty</p>
                    <Badge variant="outline" className={cn(getDifficultyBadgeClass(task.difficulty))}>
                      {task.difficulty}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Categories</p>
                    <div className="flex items-center gap-1.5">
                      <Tag className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">{task.categories}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Agent Timeout</p>
                    <p className="text-xl font-semibold">{task.maxAgentTimeoutSec}s</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Test Timeout</p>
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
                <CodeBlock content={file.content} filename={file.name} />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Changes Tab - Shows diff between versions */}
        {diffData && (
          <TabsContent value="changes" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="size-5" />
                  Recent Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DiffViewer
                  changes={diffData.changes}
                  fromVersion={diffData.fromVersion}
                  toVersion={diffData.toVersion}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

        <ConfirmModal
          open={isStartReviewModalOpen}
          onOpenChange={setIsStartReviewModalOpen}
          title="Start Review"
          description="Once you start reviewing, this task will be assigned to you and marked as 'In Review'. Other reviewers won't be able to review it until you submit your decision."
          confirmText="Start Review"
          variant="default"
          isLoading={startReviewMutation.isPending}
          onConfirm={() => startReviewMutation.mutate()}
        />
          </div>
        </div>
        </div>
      </div>

      {/* Activity Sidebar - shows history and feedback */}
      <ActivitySidebar
        taskId={taskId}
        reviews={(task.reviews || []).map(r => ({
          ...r,
          createdAt: typeof r.createdAt === 'string' 
            ? r.createdAt 
            : r.createdAt instanceof Date 
            ? r.createdAt.toISOString() 
            : new Date().toISOString()
        }))}
        auditLogs={auditLogs}
        taskState={task.state || ''}
        isLoading={isLoadingAudit}
      />

      {/* Review Sidebar - visible when task can be reviewed */}
      {canReview && (
        <ReviewSidebar
          taskId={taskId}
          taskTitle={task.title}
          previousReview={latestReview ? { decision: latestReview.decision, comment: latestReview.comment } : undefined}
          onSuccess={() => {
            router.push('/reviewer')
          }}
        />
      )}
    </div>
  )
}
