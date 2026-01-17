'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { reviewerApi } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ReviewModal, ConfirmModal } from '@/components/modals'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isStartReviewModalOpen, setIsStartReviewModalOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['reviewer', 'tasks', taskId],
    queryFn: () => reviewerApi.getTask(taskId),
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

  const task = data
  if (!task) {
    return (
      <div className="py-6">
        <Alert>
          <AlertDescription>Task not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  const canStartReview = task.state === 'SUBMITTED'
  const canSubmitReview = task.state === 'IN_REVIEW'

  const files = [
    { name: 'task.yaml', content: task.taskYaml },
    { name: 'docker-compose.yaml', content: task.dockerComposeYaml },
    { name: 'solution.sh', content: task.solutionSh },
    { name: 'run-tests.sh', content: task.runTestsSh },
    { name: 'tests.json', content: task.testsJson },
  ].filter((f): f is { name: string; content: string } => f.content !== null && f.content !== undefined)

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/reviewer">
            <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
              <Badge variant="outline" className={cn("text-xs", getStateBadgeClass(task.state))}>
                {task.state.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="size-3.5" />
                {task.author?.name || task.author?.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Submitted {new Date(task.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canStartReview && (
            <Button
              onClick={() => setIsStartReviewModalOpen(true)}
              className="gap-2 bg-teal-600 hover:bg-teal-700"
            >
              <Play className="size-4" />
              Start Review
            </Button>
          )}
          {canSubmitReview && (
            <Button
              onClick={() => setIsReviewModalOpen(true)}
              className="gap-2 bg-teal-600 hover:bg-teal-700"
            >
              <ClipboardCheck className="size-4" />
              Submit Review
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner for IN_REVIEW */}
      {task.state === 'IN_REVIEW' && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Timer className="size-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-blue-400">Review in Progress</p>
            <p className="text-sm text-muted-foreground">
              You are currently reviewing this task. Submit your decision when ready.
            </p>
          </div>
          <Button
            onClick={() => setIsReviewModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Submit Review
          </Button>
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
          {task.reviews && task.reviews.length > 0 && (
            <TabsTrigger value="history" className="gap-2">
              <Clock className="size-4" />
              History ({task.reviews.length})
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

        {task.reviews && task.reviews.length > 0 && (
          <TabsContent value="history" className="mt-0">
            <div className="space-y-4">
              {task.reviews.map((review: any, index: number) => {
                const DecisionIcon = review.decision === 'APPROVE' ? CheckCircle2 :
                  review.decision === 'REJECT' ? XCircle : AlertTriangle
                const decisionColor = review.decision === 'APPROVE' ? 'text-emerald-500' :
                  review.decision === 'REJECT' ? 'text-red-500' : 'text-amber-500'

                return (
                  <Card
                    key={review.id}
                    className={cn("border-border/50 animate-slide-up")}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                          review.decision === 'APPROVE' && 'bg-emerald-500/10',
                          review.decision === 'REJECT' && 'bg-red-500/10',
                          review.decision === 'REQUEST_CHANGES' && 'bg-amber-500/10',
                        )}>
                          <DecisionIcon className={cn("size-5", decisionColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-medium">
                                {review.reviewer?.name || review.reviewer?.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                review.decision === 'APPROVE' && 'badge-approved',
                                review.decision === 'REJECT' && 'badge-rejected',
                                review.decision === 'REQUEST_CHANGES' && 'badge-changes',
                              )}
                            >
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

      <ReviewModal
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        taskId={taskId}
        taskTitle={task.title}
        onSuccess={() => {
          router.push('/reviewer')
        }}
      />
    </div>
  )
}
