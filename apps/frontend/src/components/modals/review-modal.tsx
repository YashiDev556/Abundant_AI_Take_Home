"use client"

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewerApi } from '@/lib/api-client'
import { ReviewDecision } from '@repo/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  taskTitle?: string
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

export function ReviewModal({ open, onOpenChange, taskId, taskTitle, onSuccess }: ReviewModalProps) {
  const queryClient = useQueryClient()
  const [decision, setDecision] = useState<ReviewDecision | null>(null)
  const [comment, setComment] = useState('')

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!decision) throw new Error('Please select a decision')
      return reviewerApi.submitReview(taskId, decision, comment || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewer', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['reviewer', 'tasks', taskId] })
      onSuccess?.()
      onOpenChange(false)
      // Reset state
      setDecision(null)
      setComment('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10">
              <MessageSquare className="size-5 text-teal-400" />
            </div>
            <div>
              <DialogTitle>Submit Review</DialogTitle>
              <DialogDescription>
                {taskTitle ? `Reviewing: ${taskTitle}` : 'Provide your review decision'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Decision *</Label>
              <div className="grid grid-cols-3 gap-3">
                {decisionOptions.map((option) => {
                  const Icon = option.icon
                  const isSelected = decision === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDecision(option.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200",
                        isSelected ? option.selectedClassName : option.className
                      )}
                    >
                      <Icon className={cn(
                        "size-6",
                        option.value === 'APPROVE' && 'text-emerald-500',
                        option.value === 'REQUEST_CHANGES' && 'text-amber-500',
                        option.value === 'REJECT' && 'text-red-500',
                      )} />
                      <div className="text-center">
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm font-medium">
                Comment {decision === 'REQUEST_CHANGES' && <span className="text-amber-500">*</span>}
              </Label>
              <Textarea
                id="comment"
                rows={4}
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
                className="resize-none"
                required={decision === 'REQUEST_CHANGES' || decision === 'REJECT'}
              />
              <p className="text-xs text-muted-foreground">
                {decision === 'APPROVE'
                  ? 'Optional notes will be shared with the task creator'
                  : 'Your feedback will help the creator improve the task'}
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            {submitMutation.error && (
              <Alert variant="destructive" className="mr-auto">
                <AlertDescription>{submitMutation.error.message}</AlertDescription>
              </Alert>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending || !decision}
              className={cn(
                "min-w-[140px]",
                decision === 'APPROVE' && 'bg-emerald-600 hover:bg-emerald-700',
                decision === 'REQUEST_CHANGES' && 'bg-amber-600 hover:bg-amber-700',
                decision === 'REJECT' && 'bg-red-600 hover:bg-red-700',
              )}
            >
              {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
