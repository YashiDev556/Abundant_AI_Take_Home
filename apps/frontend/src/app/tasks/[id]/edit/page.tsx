'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '@/lib/api-client'
import { Difficulty } from '@repo/types'
import { Button } from '@/components/ui/button'

export default function EditTaskPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const taskId = params.id as string

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksApi.get(taskId),
  })

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

  // Populate form when task data loads
  useEffect(() => {
    if (data) {
      const task = data
      setFormData({
        title: task.title || '',
        instruction: task.instruction || '',
        difficulty: task.difficulty || Difficulty.MEDIUM,
        categories: task.categories || '',
        maxAgentTimeoutSec: task.maxAgentTimeoutSec || 300,
        maxTestTimeoutSec: task.maxTestTimeoutSec || 60,
        taskYaml: task.taskYaml || '',
        dockerComposeYaml: task.dockerComposeYaml || '',
        solutionSh: task.solutionSh || '',
        runTestsSh: task.runTestsSh || '',
        testsJson: task.testsJson || '',
      })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => tasksApi.update(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      router.push(`/tasks/${taskId}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Convert categories string to array (comma-separated)
    const categoriesArray = formData.categories.split(',').map(c => c.trim()).filter(c => c)
    
    updateMutation.mutate({
      ...formData,
      categories: categoriesArray.join(','),
    })
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    )
  }

  const task = data

  if (!task) {
    return (
      <div className="p-8">
        <p>Task not found</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Task</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Instruction (Prompt) *</label>
            <textarea
              required
              rows={4}
              value={formData.instruction}
              onChange={(e) => handleChange('instruction', e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="The prompt given to the agent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty *</label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleChange('difficulty', e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categories *</label>
              <input
                type="text"
                required
                value={formData.categories}
                onChange={(e) => handleChange('categories', e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Comma-separated (e.g., testing, example)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Max Agent Timeout (seconds) *</label>
              <input
                type="number"
                required
                min={1}
                value={formData.maxAgentTimeoutSec}
                onChange={(e) => handleChange('maxAgentTimeoutSec', parseInt(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Test Timeout (seconds) *</label>
              <input
                type="number"
                required
                min={1}
                value={formData.maxTestTimeoutSec}
                onChange={(e) => handleChange('maxTestTimeoutSec', parseInt(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Task Files */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Task Files</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">task.yaml</label>
            <textarea
              rows={8}
              value={formData.taskYaml}
              onChange={(e) => handleChange('taskYaml', e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="YAML content for task.yaml"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">docker-compose.yaml</label>
            <textarea
              rows={8}
              value={formData.dockerComposeYaml}
              onChange={(e) => handleChange('dockerComposeYaml', e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="YAML content for docker-compose.yaml"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">solution.sh</label>
            <textarea
              rows={8}
              value={formData.solutionSh}
              onChange={(e) => handleChange('solutionSh', e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="Bash script content for solution.sh"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">run-tests.sh</label>
            <textarea
              rows={8}
              value={formData.runTestsSh}
              onChange={(e) => handleChange('runTestsSh', e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="Bash script content for run-tests.sh"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">tests/ (JSON)</label>
            <textarea
              rows={8}
              value={formData.testsJson}
              onChange={(e) => handleChange('testsJson', e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="JSON representation of tests/ directory"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>

        {updateMutation.error && (
          <p className="text-red-500">Error: {updateMutation.error.message}</p>
        )}
      </form>
    </div>
  )
}
