'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '@/lib/api-client'
import { Task, Difficulty } from '@repo/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Loader2, Settings, FileCode, Sparkles, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function NewTaskPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    title: '',
    instruction: '',
    difficulty: Difficulty.MEDIUM,
    categories: '',
    maxAgentTimeoutSec: 300,
    maxTestTimeoutSec: 60,
    taskYaml: '',
    dockerComposeYaml: '',
    solutionSh: '',
    runTestsSh: '',
    testsJson: '',
  })

  const createMutation = useMutation<Task, Error, typeof formData>({
    mutationFn: (data) => tasksApi.create(data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      router.push(`/tasks/${task.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const categoriesArray = formData.categories.split(',').map(c => c.trim()).filter(c => c)
    createMutation.mutate({
      ...formData,
      categories: categoriesArray.join(','),
    })
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/tasks">
          <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create New Task</h1>
          </div>
          <p className="text-muted-foreground mt-1 ml-11">
            Create a new benchmark task for Terminal-Bench 2.0
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basics" className="w-full">
          <TabsList className="mb-6 bg-secondary/30">
            <TabsTrigger value="basics" className="gap-2">
              <Info className="size-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="size-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <FileCode className="size-4" />
              Task Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basics">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Provide the essential details for your task</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
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
                  <Label htmlFor="instruction" className="text-sm font-medium">Instruction (Prompt) *</Label>
                  <Textarea
                    id="instruction"
                    required
                    rows={8}
                    value={formData.instruction}
                    onChange={(e) => handleChange('instruction', e.target.value)}
                    placeholder="The prompt given to the agent"
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty" className="text-sm font-medium">Difficulty *</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => handleChange('difficulty', value)}
                    >
                      <SelectTrigger id="difficulty" className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EASY">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Easy
                          </span>
                        </SelectItem>
                        <SelectItem value="MEDIUM">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Medium
                          </span>
                        </SelectItem>
                        <SelectItem value="HARD">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Hard
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categories" className="text-sm font-medium">Categories *</Label>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Execution Configuration</CardTitle>
                <CardDescription>Set timeout limits for task execution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
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
                      onChange={(e) => handleChange('maxAgentTimeoutSec', parseInt(e.target.value))}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">Maximum time allowed for agent execution</p>
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
                      onChange={(e) => handleChange('maxTestTimeoutSec', parseInt(e.target.value))}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">Maximum time allowed for test execution</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Task Files</CardTitle>
                <CardDescription>Provide the task configuration and solution files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="taskYaml" className="text-sm font-medium">task.yaml</Label>
                  <Textarea
                    id="taskYaml"
                    rows={8}
                    value={formData.taskYaml}
                    onChange={(e) => handleChange('taskYaml', e.target.value)}
                    className="font-mono text-sm resize-none"
                    placeholder="YAML configuration for the task"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dockerComposeYaml" className="text-sm font-medium">docker-compose.yaml</Label>
                  <Textarea
                    id="dockerComposeYaml"
                    rows={8}
                    value={formData.dockerComposeYaml}
                    onChange={(e) => handleChange('dockerComposeYaml', e.target.value)}
                    className="font-mono text-sm resize-none"
                    placeholder="Docker Compose configuration"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solutionSh" className="text-sm font-medium">solution.sh</Label>
                  <Textarea
                    id="solutionSh"
                    rows={8}
                    value={formData.solutionSh}
                    onChange={(e) => handleChange('solutionSh', e.target.value)}
                    className="font-mono text-sm resize-none"
                    placeholder="#!/bin/bash"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="runTestsSh" className="text-sm font-medium">run-tests.sh</Label>
                  <Textarea
                    id="runTestsSh"
                    rows={8}
                    value={formData.runTestsSh}
                    onChange={(e) => handleChange('runTestsSh', e.target.value)}
                    className="font-mono text-sm resize-none"
                    placeholder="#!/bin/bash"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testsJson" className="text-sm font-medium">tests.json</Label>
                  <Textarea
                    id="testsJson"
                    rows={8}
                    value={formData.testsJson}
                    onChange={(e) => handleChange('testsJson', e.target.value)}
                    className="font-mono text-sm resize-none"
                    placeholder='{"tests": []}'
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
          {createMutation.error && (
            <Alert variant="destructive" className="flex-1 mr-4">
              <AlertDescription>{createMutation.error.message}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3 ml-auto">
            <Link href="/tasks">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending} className="min-w-[140px]">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
