/**
 * Diff Viewer Component
 * Displays changes between two versions of content
 */

'use client'

import { useMemo } from 'react'
import { diffLines, Change } from 'diff'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { ScrollArea } from './scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { FileText, Plus, Minus, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiffChange {
  field: string
  oldValue: any
  newValue: any
  type: 'added' | 'removed' | 'modified'
}

interface DiffViewerProps {
  changes: DiffChange[]
  fromVersion?: number
  toVersion?: number
  className?: string
}

/**
 * Render a single field diff
 */
function FieldDiff({ change }: { change: DiffChange }) {
  const { field, oldValue, newValue, type } = change

  // Format field name for display
  const fieldLabel = field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()

  // For text content, show line-by-line diff
  // Handle added/removed fields: if one is null/undefined, treat the other as the value
  const oldText = oldValue !== null && oldValue !== undefined ? String(oldValue) : ''
  const newText = newValue !== null && newValue !== undefined ? String(newValue) : ''
  const isLongText = (oldText.length > 100 || newText.length > 100)

  if (isLongText) {
    const diff = diffLines(oldText, newText)

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{fieldLabel}</CardTitle>
            <Badge variant={type === 'added' ? 'default' : type === 'removed' ? 'destructive' : 'secondary'}>
              {type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full max-h-[400px]">
            <div className="font-mono text-sm">
              {diff.map((part, index) => {
                const lineClass = cn(
                  'px-3 py-1',
                  part.added && 'bg-emerald-500/10 text-emerald-600',
                  part.removed && 'bg-red-500/10 text-red-600'
                )

                return (
                  <div key={index} className={lineClass}>
                    {part.added && <Plus className="inline size-3 mr-2" />}
                    {part.removed && <Minus className="inline size-3 mr-2" />}
                    {part.value.split('\n').map((line, i) => (
                      <div key={i}>{line || ' '}</div>
                    ))}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  // For simple values, show side-by-side comparison
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{fieldLabel}</CardTitle>
          <Badge variant={type === 'added' ? 'default' : type === 'removed' ? 'destructive' : 'secondary'}>
            {type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          {type !== 'added' && (
            <div className="flex-1 p-3 rounded-lg bg-red-500/5 border border-red-200/50">
              <div className="text-xs text-muted-foreground mb-1">Previous</div>
              <div className="text-sm text-red-600 font-mono break-words">
                {oldValue !== null && oldValue !== undefined ? String(oldValue) : '(empty)'}
              </div>
            </div>
          )}
          
          {type === 'modified' && (
            <ArrowRight className="size-4 text-muted-foreground shrink-0" />
          )}
          
          {type !== 'removed' && (
            <div className="flex-1 p-3 rounded-lg bg-emerald-500/5 border border-emerald-200/50">
              <div className="text-xs text-muted-foreground mb-1">New</div>
              <div className="text-sm text-emerald-600 font-mono break-words">
                {newValue !== null && newValue !== undefined ? String(newValue) : '(empty)'}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Main diff viewer component
 */
export function DiffViewer({ changes, fromVersion, toVersion, className }: DiffViewerProps) {
  // Categorize changes
  const { textChanges, metadataChanges } = useMemo(() => {
    const textFields = ['taskYaml', 'dockerComposeYaml', 'solutionSh', 'runTestsSh', 'testsJson', 'instruction']
    
    return {
      textChanges: changes.filter((c) => textFields.includes(c.field)),
      metadataChanges: changes.filter((c) => !textFields.includes(c.field)),
    }
  }, [changes])

  if (changes.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="size-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No changes detected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Changes Overview</h3>
          <p className="text-sm text-muted-foreground">
            Comparing {fromVersion !== undefined && `version ${fromVersion}`} 
            {fromVersion !== undefined && toVersion !== undefined && ' → '}
            {toVersion !== undefined && `version ${toVersion}`}
          </p>
        </div>
        <Badge variant="secondary">
          {changes.length} {changes.length === 1 ? 'change' : 'changes'}
        </Badge>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Changes ({changes.length})</TabsTrigger>
          <TabsTrigger value="metadata">Metadata ({metadataChanges.length})</TabsTrigger>
          <TabsTrigger value="files">Files ({textChanges.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {changes.map((change, index) => (
            <FieldDiff key={`${change.field}-${index}`} change={change} />
          ))}
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          {metadataChanges.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No metadata changes</p>
              </CardContent>
            </Card>
          ) : (
            metadataChanges.map((change, index) => (
              <FieldDiff key={`${change.field}-${index}`} change={change} />
            ))
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          {textChanges.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No file changes</p>
              </CardContent>
            </Card>
          ) : (
            textChanges.map((change, index) => (
              <FieldDiff key={`${change.field}-${index}`} change={change} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
