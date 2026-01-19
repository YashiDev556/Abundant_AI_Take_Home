"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { diffLines } from 'diff'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { auditApi } from '@/lib/api-client'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
  GripVertical,
  Send,
  Edit,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  History,
  GitCommit,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isValid } from 'date-fns'

interface Review {
  id: string
  decision: string
  comment?: string | null
  createdAt: string | Date
  reviewer?: {
    id: string
    name?: string | null
    email: string
  }
}

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  userId: string
  userName?: string | null
  userEmail?: string | null
  metadata?: any
  createdAt: string
}

interface ActivitySidebarProps {
  taskId: string
  reviews: Review[]
  auditLogs: AuditLog[]
  taskState: string
  isLoading?: boolean
}

const MIN_WIDTH = 320
const MAX_WIDTH = 550
const DEFAULT_WIDTH = 380
const COLLAPSED_WIDTH = 48

// Timeline entry types
type TimelineEntry = 
  | { type: 'review'; data: Review; date: Date }
  | { type: 'log'; data: AuditLog; date: Date }

function buildTimeline(reviews: Review[], auditLogs: AuditLog[]): TimelineEntry[] {
  const safeDate = (dateStr: string | Date | undefined): Date => {
    if (!dateStr) return new Date()
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? new Date() : date
  }
  
  const entries: TimelineEntry[] = [
    ...(reviews || [])
      .filter(r => r && r.createdAt)
      .map(r => ({ type: 'review' as const, data: r, date: safeDate(r.createdAt) })),
    ...(auditLogs || [])
      .filter(l => l && l.action && l.createdAt &&
                   !l.action.startsWith('REVIEW_') && 
                   !l.action.startsWith('TASK_APPROVED') && 
                   !l.action.startsWith('TASK_REJECTED') && 
                   !l.action.startsWith('TASK_CHANGES_REQUESTED'))
      .map(l => ({ type: 'log' as const, data: l, date: safeDate(l.createdAt) })),
  ]
  return entries.sort((a, b) => b.date.getTime() - a.date.getTime())
}

function getDecisionIcon(decision: string) {
  switch (decision) {
    case 'APPROVE': return CheckCircle2
    case 'REJECT': return XCircle
    case 'REQUEST_CHANGES': return AlertTriangle
    default: return GitCommit
  }
}

function getDecisionColor(decision: string) {
  switch (decision) {
    case 'APPROVE': return 'text-emerald-500'
    case 'REJECT': return 'text-red-500'
    case 'REQUEST_CHANGES': return 'text-amber-500'
    default: return 'text-muted-foreground'
  }
}

function getDecisionLabel(decision: string) {
  switch (decision) {
    case 'APPROVE': return 'Approved'
    case 'REJECT': return 'Rejected'
    case 'REQUEST_CHANGES': return 'Changes Requested'
    default: return decision
  }
}

function getEventIcon(action: string) {
  switch (action) {
    case 'TASK_CREATED': return Plus
    case 'TASK_UPDATED': return Edit
    case 'TASK_SUBMITTED': return Send
    default: return FileText
  }
}

function getEventLabel(action: string) {
  switch (action) {
    case 'TASK_CREATED': return 'Created'
    case 'TASK_UPDATED': return 'Updated'
    case 'TASK_SUBMITTED': return 'Submitted'
    default: return action.replace(/_/g, ' ').toLowerCase()
  }
}

function getStateLabel(state: string) {
  switch (state) {
    case 'DRAFT': return 'Draft'
    case 'SUBMITTED': return 'Pending Review'
    case 'IN_REVIEW': return 'In Review'
    case 'APPROVED': return 'Approved'
    case 'REJECTED': return 'Rejected'
    case 'CHANGES_REQUESTED': return 'Changes Requested'
    default: return state
  }
}

function getStateColor(state: string) {
  switch (state) {
    case 'APPROVED': return 'text-emerald-500'
    case 'REJECTED': return 'text-red-500'
    case 'CHANGES_REQUESTED': return 'text-amber-500'
    case 'IN_REVIEW': return 'text-blue-500'
    case 'SUBMITTED': return 'text-purple-500'
    default: return 'text-muted-foreground'
  }
}

// Git-style commit entry
function CommitEntry({ 
  entry, 
  isFirst,
  isLast,
  onViewDiff,
}: { 
  entry: TimelineEntry
  isFirst: boolean
  isLast: boolean
  onViewDiff?: (log: AuditLog) => void
}) {
  const [showFeedback, setShowFeedback] = useState(false)

  if (entry.type === 'review') {
    const review = entry.data
    const Icon = getDecisionIcon(review.decision)
    const hasFeedback = !!review.comment
    
    return (
      <div className="relative flex gap-3 pb-4">
        {/* Vertical line */}
        {!isLast && (
          <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
        )}
        
        {/* Commit dot */}
        <div className={cn(
          "relative z-10 shrink-0 size-6 rounded-full flex items-center justify-center",
          review.decision === 'APPROVE' && "bg-emerald-500/20",
          review.decision === 'REJECT' && "bg-red-500/20",
          review.decision === 'REQUEST_CHANGES' && "bg-amber-500/20",
        )}>
          <Icon className={cn("size-3.5", getDecisionColor(review.decision))} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2">
            <span className={cn("font-medium text-sm", getDecisionColor(review.decision))}>
              {getDecisionLabel(review.decision)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {review.reviewer?.name || review.reviewer?.email || 'Unknown'} · {isValid(entry.date) ? format(entry.date, 'MMM d, HH:mm') : 'Unknown date'}
          </div>
          
          {/* Expandable feedback */}
          {hasFeedback && (
            <div className="mt-2">
              <button
                onClick={() => setShowFeedback(!showFeedback)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showFeedback ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                {showFeedback ? 'Hide feedback' : 'Show feedback'}
              </button>
              {showFeedback && (
                <div className="mt-2 pl-3 border-l-2 border-border">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {review.comment}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Audit log entry
  const log = entry.data
  const Icon = getEventIcon(log.action)
  const hasChanges = log.action === 'TASK_UPDATED' && (log.metadata?.updates?.length > 0 || log.metadata?.changedFields?.length > 0)
  
  return (
    <div className="relative flex gap-3 pb-4">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
      )}
      
      {/* Commit dot */}
      <div className="relative z-10 shrink-0 size-6 rounded-full bg-secondary flex items-center justify-center">
        <Icon className="size-3 text-muted-foreground" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{getEventLabel(log.action)}</span>
          {hasChanges && onViewDiff && (
            <button
              onClick={() => onViewDiff(log)}
              className="text-xs text-primary hover:underline"
            >
              view diff
            </button>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {log.userName || log.userEmail || 'Unknown'} · {isValid(entry.date) ? format(entry.date, 'MMM d, HH:mm') : 'Unknown date'}
        </div>
      </div>
    </div>
  )
}

interface TaskHistory {
  id: string
  version: number
  createdAt: string
}

interface DiffChange {
  field: string
  oldValue: any
  newValue: any
  type: 'added' | 'removed' | 'modified'
}

export function ActivitySidebar({ taskId, reviews, auditLogs, taskState, isLoading }: ActivitySidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  // Diff modal state
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [diffData, setDiffData] = useState<{ changes: DiffChange[], fromVersion: number, toVersion: number } | null>(null)
  const [isLoadingDiff, setIsLoadingDiff] = useState(false)
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([])

  // Build timeline
  const timeline = useMemo(() => buildTimeline(reviews, auditLogs), [reviews, auditLogs])
  
  // Fetch task history on mount
  useEffect(() => {
    if (taskId) {
      auditApi.getTaskHistory(taskId).then(setTaskHistory).catch(() => {})
    }
  }, [taskId])
  
  // Handle viewing changes for a specific log entry
  const handleViewChanges = useCallback(async (log: AuditLog) => {
    setSelectedLog(log)
    setIsDiffModalOpen(true)
    setIsLoadingDiff(true)
    
    try {
      // Find the version that corresponds to this log entry by matching timestamps
      const logTime = new Date(log.createdAt).getTime()
      const sortedHistory = [...taskHistory].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      
      // Find the version created at or just after this log entry
      let toVersion = 1
      let fromVersion = 0
      
      for (let i = 0; i < sortedHistory.length; i++) {
        const versionTime = new Date(sortedHistory[i].createdAt).getTime()
        if (Math.abs(versionTime - logTime) < 5000) { // Within 5 seconds
          toVersion = sortedHistory[i].version
          fromVersion = toVersion - 1
          break
        }
      }
      
      if (fromVersion < 1) fromVersion = 1
      if (toVersion < 2) toVersion = 2
      
      const diff = await auditApi.getTaskDiff(taskId, fromVersion, toVersion)
      setDiffData(diff)
    } catch (error) {
      console.error('Failed to fetch diff:', error)
      setDiffData(null)
    } finally {
      setIsLoadingDiff(false)
    }
  }, [taskId, taskHistory])

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

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "relative flex-shrink-0 border-l border-border bg-card h-full",
        "transition-[width] duration-200 ease-in-out"
      )}
      style={{ width: isOpen ? width : COLLAPSED_WIDTH }}
    >
      {/* Drag handle */}
      {isOpen && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10",
            "hover:bg-primary/50 transition-colors",
            "group",
            isDragging && "bg-primary"
          )}
        >
          <div className="absolute left-0 w-3 h-full" />
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
            className="h-9 w-9 text-primary hover:text-primary/80 hover:bg-primary/10"
            title="Open activity panel"
          >
            <PanelRightOpen className="size-5" />
          </Button>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180">
              Activity & Feedback
            </span>
          </div>
        </div>
      )}

      {/* Open state */}
      {isOpen && (
        <div className="h-full flex flex-col">
          {/* Header with current status */}
          <div className="flex-shrink-0 border-b border-border">
            <div className="flex items-center justify-between px-3 py-2.5 bg-secondary/30">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-md flex-shrink-0 bg-primary/10">
                  <History className="size-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Activity</h3>
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
            
            {/* Current Status */}
            <div className="px-4 py-3 bg-secondary/20">
              <div className="text-xs text-muted-foreground mb-1">Current Status</div>
              <div className={cn("font-semibold", getStateColor(taskState))}>
                {getStateLabel(taskState)}
              </div>
            </div>
          </div>

          {/* Git-style Timeline */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="size-6 rounded-full bg-secondary/50 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-secondary/50 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-secondary/50 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <div className="text-center py-8">
                <History className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="p-4">
                {timeline.map((entry, index) => (
                  <CommitEntry
                    key={entry.type === 'review' ? `r-${entry.data.id}` : `l-${entry.data.id}`}
                    entry={entry}
                    isFirst={index === 0}
                    isLast={index === timeline.length - 1}
                    onViewDiff={entry.type === 'log' ? handleViewChanges : undefined}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Diff Modal - Git style */}
      <Dialog open={isDiffModalOpen} onOpenChange={setIsDiffModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b border-border bg-secondary/50 flex-shrink-0">
            <DialogTitle className="text-sm font-mono flex items-center gap-2">
              <GitCommit className="size-4" />
              {selectedLog && format(new Date(selectedLog.createdAt), 'MMM d, yyyy HH:mm')}
              {diffData && (
                <span className="text-muted-foreground font-normal">
                  ({diffData.changes?.length || 0} file{diffData.changes?.length !== 1 ? 's' : ''} changed)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            {isLoadingDiff ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : diffData && diffData.changes && diffData.changes.length > 0 ? (
              <div className="divide-y divide-border">
                {diffData.changes.map((change, i) => {
                  const oldVal = String(change.oldValue || '')
                  const newVal = String(change.newValue || '')
                  const lineDiff = diffLines(oldVal, newVal)
                  
                  // Count additions and deletions
                  let additions = 0
                  let deletions = 0
                  lineDiff.forEach(part => {
                    const lines = part.value.split('\n').filter(l => l).length
                    if (part.added) additions += lines
                    if (part.removed) deletions += lines
                  })

                  return (
                    <div key={i}>
                      {/* File header */}
                      <div className="px-4 py-2 bg-secondary/30 flex items-center gap-3 text-sm font-mono">
                        <FileText className="size-4 text-muted-foreground" />
                        <span>{change.field}</span>
                        <span className="ml-auto text-xs">
                          <span className="text-emerald-500">+{additions}</span>
                          {' '}
                          <span className="text-red-500">-{deletions}</span>
                        </span>
                      </div>
                      
                      {/* Diff content */}
                      <div className="font-mono text-xs overflow-x-auto">
                        {lineDiff.map((part, partIndex) => {
                          const lines = part.value.split('\n')
                          // Remove last empty line from split
                          if (lines[lines.length - 1] === '') lines.pop()
                          
                          return lines.map((line, lineIndex) => (
                            <div
                              key={`${partIndex}-${lineIndex}`}
                              className={cn(
                                "px-4 py-0.5 border-l-2 flex",
                                part.added && "bg-emerald-500/10 border-l-emerald-500",
                                part.removed && "bg-red-500/10 border-l-red-500",
                                !part.added && !part.removed && "border-l-transparent"
                              )}
                            >
                              <span className={cn(
                                "w-6 shrink-0 select-none text-right pr-3",
                                part.added && "text-emerald-500",
                                part.removed && "text-red-500",
                                !part.added && !part.removed && "text-muted-foreground"
                              )}>
                                {part.added ? '+' : part.removed ? '-' : ' '}
                              </span>
                              <span className={cn(
                                "flex-1 whitespace-pre-wrap break-all",
                                part.added && "text-emerald-400",
                                part.removed && "text-red-400"
                              )}>
                                {line || ' '}
                              </span>
                            </div>
                          ))
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No diff available</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
