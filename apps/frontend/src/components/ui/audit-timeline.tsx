/**
 * Audit Timeline Component
 * Displays a chronological timeline of audit log entries
 */

'use client'

import { format } from 'date-fns'
import { Badge } from './badge'
import { Card, CardContent } from './card'
import { ScrollArea } from './scroll-area'
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Send,
  Edit,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AUDIT_ACTION_LABELS } from '@repo/types'

interface AuditLogEntry {
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

interface AuditTimelineProps {
  logs: AuditLogEntry[]
  className?: string
  maxHeight?: string
}

/**
 * Get icon for audit action
 */
function getActionIcon(action: string) {
  const iconClass = 'size-4'
  
  switch (action) {
    case 'TASK_CREATED':
      return <Plus className={iconClass} />
    case 'TASK_UPDATED':
      return <Edit className={iconClass} />
    case 'TASK_SUBMITTED':
      return <Send className={iconClass} />
    case 'TASK_APPROVED':
      return <CheckCircle className={iconClass} />
    case 'TASK_REJECTED':
      return <XCircle className={iconClass} />
    case 'TASK_CHANGES_REQUESTED':
      return <AlertCircle className={iconClass} />
    case 'REVIEW_STARTED':
      return <Eye className={iconClass} />
    case 'REVIEW_SUBMITTED':
      return <FileText className={iconClass} />
    case 'REVIEW_DECISION_CHANGED':
      return <RefreshCw className={iconClass} />
    default:
      return <FileText className={iconClass} />
  }
}

/**
 * Get color for audit action
 */
function getActionColor(action: string) {
  switch (action) {
    case 'TASK_CREATED':
      return 'text-blue-500 bg-blue-500/10'
    case 'TASK_UPDATED':
      return 'text-amber-500 bg-amber-500/10'
    case 'TASK_SUBMITTED':
      return 'text-purple-500 bg-purple-500/10'
    case 'TASK_APPROVED':
      return 'text-emerald-500 bg-emerald-500/10'
    case 'TASK_REJECTED':
      return 'text-red-500 bg-red-500/10'
    case 'TASK_CHANGES_REQUESTED':
      return 'text-orange-500 bg-orange-500/10'
    case 'REVIEW_STARTED':
      return 'text-indigo-500 bg-indigo-500/10'
    case 'REVIEW_SUBMITTED':
      return 'text-cyan-500 bg-cyan-500/10'
    case 'REVIEW_DECISION_CHANGED':
      return 'text-pink-500 bg-pink-500/10'
    default:
      return 'text-muted-foreground bg-muted'
  }
}

/**
 * Format state names for display
 */
function formatState(state: string): string {
  const stateLabels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted for Review',
    IN_REVIEW: 'In Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CHANGES_REQUESTED: 'Changes Requested',
  }
  return stateLabels[state] || state.replace(/_/g, ' ')
}

/**
 * Format decision for display
 */
function formatDecision(decision: string): string {
  const decisionLabels: Record<string, string> = {
    APPROVE: 'Approved',
    REJECT: 'Rejected',
    REQUEST_CHANGES: 'Requested Changes',
  }
  return decisionLabels[decision] || decision
}

/**
 * Metadata display component with smart formatting
 */
function MetadataDisplay({ metadata, action }: { metadata: any; action: string }) {
  // Filter out internal fields
  const hiddenFields = ['reviewId', 'taskId', 'hasComment', 'isDecisionChange']
  
  // Special handling for different action types
  if (action === 'TASK_SUBMITTED' || action === 'REVIEW_STARTED') {
    return (
      <div className="space-y-1.5 text-xs">
        {metadata.previousState && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">From:</span>
            <Badge variant="outline" className="text-xs font-normal">
              {formatState(metadata.previousState)}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="text-xs font-normal">
              {formatState(metadata.currentState)}
            </Badge>
          </div>
        )}
      </div>
    )
  }

  if (action === 'REVIEW_SUBMITTED' || action === 'TASK_APPROVED' || action === 'TASK_REJECTED' || action === 'TASK_CHANGES_REQUESTED') {
    return (
      <div className="space-y-1.5 text-xs">
        {metadata.decision && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Decision:</span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-medium",
                metadata.decision === 'APPROVE' && 'border-emerald-500/50 text-emerald-500',
                metadata.decision === 'REJECT' && 'border-red-500/50 text-red-500',
                metadata.decision === 'REQUEST_CHANGES' && 'border-amber-500/50 text-amber-500',
              )}
            >
              {formatDecision(metadata.decision)}
            </Badge>
          </div>
        )}
        {metadata.previousState && metadata.currentState && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="outline" className="text-xs font-normal">
              {formatState(metadata.previousState)}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="text-xs font-normal">
              {formatState(metadata.currentState)}
            </Badge>
          </div>
        )}
      </div>
    )
  }

  if (action === 'REVIEW_DECISION_CHANGED') {
    return (
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Changed:</span>
          <Badge variant="outline" className="text-xs font-normal">
            {formatState(metadata.previousDecision)}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline" className="text-xs font-normal">
            {formatState(metadata.newDecision)}
          </Badge>
        </div>
      </div>
    )
  }

  if (action === 'TASK_UPDATED' && metadata.updates) {
    const updates = Array.isArray(metadata.updates) ? metadata.updates : []
    return (
      <div className="space-y-1.5 text-xs">
        <span className="text-muted-foreground">Updated fields:</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {updates.map((field: string) => (
            <Badge key={field} variant="secondary" className="text-xs font-normal">
              {field.replace(/([A-Z])/g, ' $1').trim()}
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  // Default: show remaining fields nicely
  const displayEntries = Object.entries(metadata).filter(
    ([key]) => !hiddenFields.includes(key)
  )

  if (displayEntries.length === 0) return null

  return (
    <dl className="space-y-1 text-xs">
      {displayEntries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <dt className="text-muted-foreground font-medium min-w-[80px]">
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}:
          </dt>
          <dd className="text-foreground">
            {typeof value === 'boolean' 
              ? (value ? 'Yes' : 'No')
              : typeof value === 'object' 
                ? JSON.stringify(value) 
                : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Single timeline entry
 */
function TimelineEntry({ log, isLast }: { log: AuditLogEntry; isLast: boolean }) {
  const actionLabel = (AUDIT_ACTION_LABELS as any)[log.action] || log.action
  const colorClass = getActionColor(log.action)

  return (
    <div className="relative flex gap-4 pb-8">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-9 bottom-0 w-px bg-border" />
      )}

      {/* Icon */}
      <div className={cn('shrink-0 size-8 rounded-full flex items-center justify-center', colorClass)}>
        {getActionIcon(log.action)}
      </div>

      {/* Content */}
      <div className="flex-1 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-sm">{actionLabel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              by {log.userName || log.userEmail || 'Unknown'}
            </p>
          </div>
          <time className="text-xs text-muted-foreground shrink-0">
            {format(new Date(log.createdAt), 'MMM d, HH:mm')}
          </time>
        </div>

        {/* Metadata - Formatted */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <Card className="mt-2 bg-muted/30">
            <CardContent className="p-3">
              <MetadataDisplay metadata={log.metadata} action={log.action} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

/**
 * Main audit timeline component
 */
export function AuditTimeline({ logs, className, maxHeight = '600px' }: AuditTimelineProps) {
  if (logs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="size-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No activity recorded</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Activity Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Complete history of all actions and changes
          </p>
        </div>
        <Badge variant="secondary">{logs.length} events</Badge>
      </div>

      <ScrollArea style={{ maxHeight }} className="w-full">
        <div className="pr-4">
          {logs.map((log, index) => (
            <TimelineEntry
              key={log.id}
              log={log}
              isLast={index === logs.length - 1}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
