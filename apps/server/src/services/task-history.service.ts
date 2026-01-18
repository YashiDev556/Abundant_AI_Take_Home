/**
 * Task History Service
 * Manages versioning and history tracking for tasks to enable diff views
 */

import { prisma } from '@repo/db'
import { Task } from '@repo/types'

interface CreateHistoryParams {
  task: Task
  changedBy: string
  changeType: string
}

export class TaskHistoryService {
  /**
   * Create a snapshot of the current task state
   */
  static async createSnapshot(params: CreateHistoryParams) {
    const { task, changedBy, changeType } = params

    // Get the next version number
    const latestVersion = await prisma.taskHistory.findFirst({
      where: { taskId: task.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    const nextVersion = (latestVersion?.version || 0) + 1

    return await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        version: nextVersion,
        state: task.state,
        title: task.title,
        instruction: task.instruction,
        difficulty: task.difficulty,
        categories: task.categories,
        maxAgentTimeoutSec: task.maxAgentTimeoutSec,
        maxTestTimeoutSec: task.maxTestTimeoutSec,
        taskYaml: task.taskYaml,
        dockerComposeYaml: task.dockerComposeYaml,
        solutionSh: task.solutionSh,
        runTestsSh: task.runTestsSh,
        testsJson: task.testsJson,
        changedBy,
        changeType,
      },
    })
  }

  /**
   * Get all versions of a task
   */
  static async getTaskHistory(taskId: string) {
    return await prisma.taskHistory.findMany({
      where: { taskId },
      orderBy: { version: 'desc' },
    })
  }

  /**
   * Get a specific version of a task
   */
  static async getVersion(taskId: string, version: number) {
    return await prisma.taskHistory.findFirst({
      where: { taskId, version },
    })
  }

  /**
   * Get the diff between two versions
   */
  static async getDiff(taskId: string, fromVersion: number, toVersion: number) {
    const [from, to] = await Promise.all([
      this.getVersion(taskId, fromVersion),
      this.getVersion(taskId, toVersion),
    ])

    if (!from || !to) {
      return null
    }

    // Compare fields and identify changes
    const changes: Array<{
      field: string
      oldValue: any
      newValue: any
      type: 'added' | 'removed' | 'modified'
    }> = []

    const fieldsToCompare = [
      'title',
      'instruction',
      'difficulty',
      'categories',
      'maxAgentTimeoutSec',
      'maxTestTimeoutSec',
      'taskYaml',
      'dockerComposeYaml',
      'solutionSh',
      'runTestsSh',
      'testsJson',
    ]

    for (const field of fieldsToCompare) {
      const oldVal = from[field as keyof typeof from]
      const newVal = to[field as keyof typeof to]

      if (oldVal !== newVal) {
        let type: 'added' | 'removed' | 'modified' = 'modified'
        if (!oldVal && newVal) type = 'added'
        if (oldVal && !newVal) type = 'removed'

        changes.push({
          field,
          oldValue: oldVal,
          newValue: newVal,
          type,
        })
      }
    }

    return {
      fromVersion,
      toVersion,
      fromState: from.state,
      toState: to.state,
      changes,
      changedBy: to.changedBy,
      changedAt: to.createdAt,
    }
  }

  /**
   * Get the latest version before a resubmission
   * Finds the most recent version with actual content changes
   */
  static async getLatestBeforeResubmission(taskId: string) {
    const versions = await prisma.taskHistory.findMany({
      where: { taskId },
      orderBy: { version: 'desc' },
    })

    if (versions.length < 2) {
      return null
    }

    const fieldsToCompare = [
      'title',
      'instruction',
      'difficulty',
      'categories',
      'maxAgentTimeoutSec',
      'maxTestTimeoutSec',
      'taskYaml',
      'dockerComposeYaml',
      'solutionSh',
      'runTestsSh',
      'testsJson',
    ]

    // Find two versions with actual content differences
    // Start from most recent and work backwards
    const current = versions[0]
    
    for (let i = 1; i < versions.length; i++) {
      const previous = versions[i]
      
      // Check if there are actual content differences
      const hasContentChanges = fieldsToCompare.some(field => {
        const oldVal = previous[field as keyof typeof previous]
        const newVal = current[field as keyof typeof current]
        return oldVal !== newVal
      })

      if (hasContentChanges) {
        return {
          previous,
          current,
        }
      }
    }

    return null
  }

  /**
   * Check if a task has any content changes in its history
   * Useful for determining if the "Changes" tab should be shown
   */
  static async hasContentChanges(taskId: string): Promise<boolean> {
    const result = await this.getLatestBeforeResubmission(taskId)
    return result !== null
  }
}
