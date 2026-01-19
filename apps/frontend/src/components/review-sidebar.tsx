"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSubmitReview } from '@/hooks/use-reviews'
import { ReviewDecision } from '@repo/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  GripVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewSidebarProps {
  taskId: string
  taskTitle?: string
  previousReview?: { decision: string; comment?: string | null } // Last review by this user
  onSuccess?: () => void
}

const decisionOptions: {
  value: ReviewDecision
  label: string
  description: string
  icon: typeof CheckCircle2
  className: string
  selectedClassName: string
}[] = [
  {
    value: ReviewDecision.APPROVE,
    label: 'Approve',
    description: 'Task meets all requirements',
    icon: CheckCircle2,
    className: 'border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5',
    selectedClassName: 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30',
  },
  {
    value: ReviewDecision.REQUEST_CHANGES,
    label: 'Request Changes',
    description: 'Task needs modifications',
    icon: AlertTriangle,
    className: 'border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5',
    selectedClassName: 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30',
  },
  {
    value: ReviewDecision.REJECT,
    label: 'Reject',
    description: 'Task does not meet standards',
    icon: XCircle,
    className: 'border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5',
    selectedClassName: 'border-red-500 bg-red-500/10 ring-2 ring-red-500/30',
  },
]

const MIN_WIDTH = 280
const MAX_WIDTH = 500
const DEFAULT_WIDTH = 340
const COLLAPSED_WIDTH = 48

export function ReviewSidebar({ taskId, taskTitle, previousReview, onSuccess }: ReviewSidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [decision, setDecision] = useState<ReviewDecision | null>(
    previousReview?.decision as ReviewDecision | null
  )
  const [comment, setComment] = useState(previousReview?.comment || '')
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const submitMutation = useSubmitReview(taskId)
  
  // Sync form with previous review when it changes (e.g., task refetch)
  useEffect(() => {
    if (previousReview) {
      setDecision(previousReview.decision as ReviewDecision)
      setComment(previousReview.comment || '')
    }
  }, [previousReview?.decision, previousReview?.comment])
  
  // Check if this is an edit of a previous review
  const isEditMode = !!previousReview

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !sidebarRef.current) return
    const sidebarRect = sidebarRef.current.getBoundingClientRect()
    const newWidth = sidebarRect.right - e.clientX
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)))
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!decision || submitMutation.isPending) return
    
    // Reset form immediately to prevent double submission
    const submittedDecision = decision
    const submittedComment = comment
    setDecision(null)
    setComment('')
    
    submitMutation.mutate(
      { decision: submittedDecision, comment: submittedComment || undefined },
      {
        onSuccess: () => {
          onSuccess?.()
        },
        onError: () => {
          // Restore form state on error
          setDecision(submittedDecision)
          setComment(submittedComment)
        },
      }
    )
  }

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "relative flex-shrink-0 border-l border-border bg-card h-full",
        "transition-[width] duration-200 ease-in-out"
      )}
      style={{ width: isOpen ? width : COLLAPSED_WIDTH }}
    >
      {/* Drag handle - only when open */}
      {isOpen && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10",
            "hover:bg-teal-500/50 transition-colors",
            "group",
            isDragging && "bg-teal-500"
          )}
        >
          <div className="absolute left-0 w-3 h-full" /> {/* Larger hit area */}
          <GripVertical className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 -translate-y-1/2 -left-1.5" />
        </div>
      )}

      {/* Collapsed state */}
      {!isOpen && (
        <div className="h-full flex flex-col items-center py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsOpen(true)}
            className="h-9 w-9 text-teal-500 hover:text-teal-400 hover:bg-teal-500/10"
            title="Open review panel"
          >
            <PanelRightOpen className="size-5" />
          </Button>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180">
              Review Panel
            </span>
          </div>
        </div>
      )}

      {/* Open state */}
      {isOpen && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-secondary/30 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-md flex-shrink-0 bg-teal-500/10">
                <MessageSquare className="size-4 text-teal-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">
                  {isEditMode ? 'Update Review' : 'Submit Review'}
                </h3>
                {taskTitle && (
                  <p className="text-xs text-muted-foreground truncate">{taskTitle}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 flex-shrink-0"
              title="Collapse panel"
            >
              <PanelRightClose className="size-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <form onSubmit={handleSubmit} className="p-3 space-y-4">
              {/* Decision Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Decision *</Label>
                <div className="space-y-1.5">
                  {decisionOptions.map((option) => {
                    const Icon = option.icon
                    const isSelected = decision === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDecision(option.value)}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all duration-200 text-left",
                          isSelected ? option.selectedClassName : option.className
                        )}
                      >
                        <Icon className={cn(
                          "size-4 flex-shrink-0",
                          option.value === 'APPROVE' && 'text-emerald-500',
                          option.value === 'REQUEST_CHANGES' && 'text-amber-500',
                          option.value === 'REJECT' && 'text-red-500',
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment" className="text-sm font-medium">
                  Comment {(decision === 'REQUEST_CHANGES' || decision === 'REJECT') && (
                    <span className="text-amber-500">*</span>
                  )}
                </Label>
                <Textarea
                  id="comment"
                  rows={5}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    decision === 'APPROVE'
                      ? 'Add any final notes (optional)'
                      : decision === 'REQUEST_CHANGES'
                      ? 'Describe the changes needed...'
                      : decision === 'REJECT'
                      ? 'Explain the reason for rejection...'
                      : 'Select a decision first...'
                  }
                  className="resize-none text-sm"
                  required={decision === 'REQUEST_CHANGES' || decision === 'REJECT'}
                />
                <p className="text-xs text-muted-foreground">
                  {decision === 'APPROVE'
                    ? 'Optional notes for the task creator'
                    : 'Help the creator improve the task'}
                </p>
              </div>

              {/* Error */}
              {submitMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{submitMutation.error.message}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitMutation.isPending || !decision}
                className={cn(
                  "w-full",
                  decision === 'APPROVE' && 'bg-emerald-600 hover:bg-emerald-700',
                  decision === 'REQUEST_CHANGES' && 'bg-amber-600 hover:bg-amber-700',
                  decision === 'REJECT' && 'bg-red-600 hover:bg-red-700',
                  !decision && 'bg-teal-600 hover:bg-teal-700'
                )}
              >
                {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update Review' : 'Submit Review'}
              </Button>
            </form>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
