"use client"

/**
 * Task Form Modal
 * Reusable modal for creating and editing tasks
 */

import { useState, useEffect, useMemo } from 'react'
import { useCreateTask, useUpdateTask } from '@/hooks/use-tasks'
import { useToast } from '@/hooks/use-toast'
import { Difficulty, DEFAULT_TIMEOUTS } from '@repo/types'
import type { Task, CreateTaskDto } from '@repo/types'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileCode, Settings, GitCompare } from 'lucide-react'

interface TaskFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task // Existing task for editing
  onSuccess?: (task: Task) => void
}

const defaultFormData: CreateTaskDto = {
  title: '',
  instruction: '',
  difficulty: Difficulty.MEDIUM,
  categories: '',
  maxAgentTimeoutSec: DEFAULT_TIMEOUTS.AGENT,
  maxTestTimeoutSec: DEFAULT_TIMEOUTS.TEST,
  taskYaml: '',
  dockerComposeYaml: '',
  solutionSh: '',
  runTestsSh: '',
  testsJson: '',
}

export function TaskFormModal({ open, onOpenChange, task, onSuccess }: TaskFormModalProps) {
  const isEditing = !!task
  const { toast } = useToast()

  const [formData, setFormData] = useState<CreateTaskDto>(defaultFormData)
  const [activeTab, setActiveTab] = useState('basics')

  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask(task?.id || '')
  const mutation = isEditing ? updateMutation : createMutation

  // Calculate current changes (diff between form data and original task)
  const currentChanges = useMemo(() => {
    if (!task) return []
    
    const changes: { field: string; oldValue: string; newValue: string }[] = []
    const fieldsToCheck: (keyof CreateTaskDto)[] = [
      'title', 'instruction', 'difficulty', 'categories',
      'maxAgentTimeoutSec', 'maxTestTimeoutSec',
      'taskYaml', 'dockerComposeYaml', 'solutionSh', 'runTestsSh', 'testsJson'
    ]
    
    for (const field of fieldsToCheck) {
      const oldValue = String(task[field] || '')
      const newValue = String(formData[field] || '')
      if (oldValue !== newValue) {
        changes.push({ field, oldValue, newValue })
      }
    }
    
    return changes
  }, [task, formData])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (task) {
        setFormData({
          title: task.title || '',
          instruction: task.instruction || '',
          difficulty: task.difficulty || Difficulty.MEDIUM,
          categories: task.categories || '',
          maxAgentTimeoutSec: task.maxAgentTimeoutSec || DEFAULT_TIMEOUTS.AGENT,
          maxTestTimeoutSec: task.maxTestTimeoutSec || DEFAULT_TIMEOUTS.TEST,
          taskYaml: task.taskYaml || '',
          dockerComposeYaml: task.dockerComposeYaml || '',
          solutionSh: task.solutionSh || '',
          runTestsSh: task.runTestsSh || '',
          testsJson: task.testsJson || '',
        })
      } else {
        setFormData(defaultFormData)
      }
      setActiveTab('basics')
    }
  }, [open, task])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Clean up categories
    const categoriesArray = formData.categories.split(',').map((c) => c.trim()).filter((c) => c)
    const cleanedData = {
      ...formData,
      categories: categoriesArray.join(','),
    }

    // Close modal immediately for instant feedback
    onOpenChange(false)
    
    mutation.mutate(cleanedData, {
      onSuccess: (data) => {
        toast({
          title: isEditing ? 'Task updated' : 'Task created',
          description: isEditing 
            ? 'Your task has been updated successfully.'
            : 'Your task has been created successfully.',
          variant: 'default',
        })
        onSuccess?.(data)
      },
      onError: (error) => {
        console.error('[TaskFormModal] Mutation error:', error)
        toast({
          title: isEditing ? 'Failed to update task' : 'Failed to create task',
          description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        })
        // Reopen modal on error so user can fix it
        onOpenChange(true)
      },
    })
  }

  const handleChange = (field: keyof CreateTaskDto, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your task details'
              : 'Fill in the details to create a new benchmark task'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-border/50 px-6 py-3 bg-secondary/20">
                <TabsList className={`grid w-full max-w-lg ${isEditing ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <TabsTrigger value="basics" className="gap-2">
                    <Settings className="size-4" />
                    Basics
                  </TabsTrigger>
                  <TabsTrigger value="config" className="gap-2">
                    <Settings className="size-4" />
                    Config
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-2">
                    <FileCode className="size-4" />
                    Files
                  </TabsTrigger>
                  {isEditing && (
                    <TabsTrigger value="changes" className="gap-2">
                      <GitCompare className="size-4" />
                      Changes
                      {currentChanges.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                          {currentChanges.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="p-6 max-h-[50vh] overflow-y-auto">
                <TabsContent value="basics" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="Enter a descriptive task title"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instruction" className="text-sm font-medium">
                      Instruction (Prompt) *
                    </Label>
                    <Textarea
                      id="instruction"
                      required
                      rows={6}
                      value={formData.instruction}
                      onChange={(e) => handleChange('instruction', e.target.value)}
                      placeholder="The prompt given to the agent"
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty" className="text-sm font-medium">
                        Difficulty *
                      </Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(value) => handleChange('difficulty', value as Difficulty)}
                      >
                        <SelectTrigger id="difficulty" className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(Difficulty).map((diff) => (
                            <SelectItem key={diff} value={diff}>
                              <span className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    diff === Difficulty.EASY
                                      ? 'bg-emerald-500'
                                      : diff === Difficulty.MEDIUM
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                />
                                {diff}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="categories" className="text-sm font-medium">
                        Categories *
                      </Label>
                      <Input
                        id="categories"
                        required
                        value={formData.categories}
                        onChange={(e) => handleChange('categories', e.target.value)}
                        placeholder="e.g., testing, docker"
                        className="h-11"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxAgentTimeoutSec" className="text-sm font-medium">
                        Max Agent Timeout (seconds) *
                      </Label>
                      <Input
                        id="maxAgentTimeoutSec"
                        type="number"
                        required
                        min={1}
                        value={formData.maxAgentTimeoutSec}
                        onChange={(e) =>
                          handleChange('maxAgentTimeoutSec', parseInt(e.target.value))
                        }
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum time for agent execution
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxTestTimeoutSec" className="text-sm font-medium">
                        Max Test Timeout (seconds) *
                      </Label>
                      <Input
                        id="maxTestTimeoutSec"
                        type="number"
                        required
                        min={1}
                        value={formData.maxTestTimeoutSec}
                        onChange={(e) =>
                          handleChange('maxTestTimeoutSec', parseInt(e.target.value))
                        }
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum time for test execution
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="files" className="mt-0 space-y-4">
                  {[
                    { key: 'taskYaml' as const, label: 'task.yaml', placeholder: 'YAML configuration for the task' },
                    { key: 'dockerComposeYaml' as const, label: 'docker-compose.yaml', placeholder: 'Docker Compose configuration' },
                    { key: 'solutionSh' as const, label: 'solution.sh', placeholder: '#!/bin/bash' },
                    { key: 'runTestsSh' as const, label: 'run-tests.sh', placeholder: '#!/bin/bash' },
                    { key: 'testsJson' as const, label: 'tests.json', placeholder: '{"tests": []}' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key} className="text-sm font-medium">
                        {label}
                      </Label>
                      <Textarea
                        id={key}
                        rows={6}
                        value={formData[key] || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="font-mono text-sm resize-none"
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </TabsContent>

                {isEditing && (
                  <TabsContent value="changes" className="mt-0 space-y-4">
                    {currentChanges.length === 0 ? (
                      <div className="text-center py-8">
                        <GitCompare className="size-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">No changes yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Edit fields in the other tabs to see your changes here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {currentChanges.length} field{currentChanges.length !== 1 ? 's' : ''} modified
                        </p>
                        {currentChanges.map(({ field, oldValue, newValue }) => {
                          const fieldLabel = field
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (str) => str.toUpperCase())
                            .trim()
                          const isLongText = oldValue.length > 50 || newValue.length > 50
                          
                          return (
                            <div key={field} className="rounded-lg border border-border overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border">
                                <span className="font-medium text-sm">{fieldLabel}</span>
                                <Badge variant="outline" className="text-xs">modified</Badge>
                              </div>
                              <div className="p-3">
                                {isLongText ? (
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-xs text-muted-foreground block mb-1">Before:</span>
                                      <ScrollArea className="max-h-24 rounded border border-red-500/20 bg-red-500/5">
                                        <pre className="p-2 text-xs font-mono text-red-600 whitespace-pre-wrap">
                                          {oldValue || '(empty)'}
                                        </pre>
                                      </ScrollArea>
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-foreground block mb-1">After:</span>
                                      <ScrollArea className="max-h-24 rounded border border-emerald-500/20 bg-emerald-500/5">
                                        <pre className="p-2 text-xs font-mono text-emerald-600 whitespace-pre-wrap">
                                          {newValue || '(empty)'}
                                        </pre>
                                      </ScrollArea>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="px-2 py-1 rounded bg-red-500/10 text-red-600 line-through">
                                      {oldValue || '(empty)'}
                                    </span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600">
                                      {newValue || '(empty)'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </DialogBody>

          <DialogFooter>
            {mutation.error && (
              <Alert variant="destructive" className="mr-auto">
                <AlertDescription>{(mutation.error as Error).message}</AlertDescription>
              </Alert>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="min-w-[120px]">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
