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
    default:
      return 'text-muted-foreground bg-muted'
  }
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

        {/* Metadata */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <Card className="mt-2 bg-muted/30">
            <CardContent className="p-3">
              <dl className="space-y-1 text-xs">
                {Object.entries(log.metadata).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="text-muted-foreground font-medium min-w-[100px]">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </dt>
                    <dd className="font-mono text-foreground">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
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
