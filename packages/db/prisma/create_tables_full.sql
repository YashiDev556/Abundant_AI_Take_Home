-- SQL script to create all tables for Terminal-Bench Task Review Tool
-- Run this in: Supabase Dashboard > SQL Editor > New Query

-- Create enums
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('USER', 'REVIEWER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TaskState" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReviewDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM ('TASK_CREATED', 'TASK_UPDATED', 'TASK_SUBMITTED', 'TASK_APPROVED', 'TASK_REJECTED', 'TASK_CHANGES_REQUESTED', 'TASK_DELETED', 'REVIEW_STARTED', 'REVIEW_SUBMITTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update users table to add role
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Create tasks table
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "instruction" TEXT NOT NULL,
  "difficulty" "Difficulty" NOT NULL,
  "categories" TEXT NOT NULL,
  "maxAgentTimeoutSec" INTEGER NOT NULL,
  "maxTestTimeoutSec" INTEGER NOT NULL,
  "taskYaml" TEXT,
  "dockerComposeYaml" TEXT,
  "solutionSh" TEXT,
  "runTestsSh" TEXT,
  "testsJson" TEXT,
  "state" "TaskState" NOT NULL DEFAULT 'DRAFT',
  "authorId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasks_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tasks_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "decision" "ReviewDecision" NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reviews_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "action" "AuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT,
  "userEmail" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create task_history table
CREATE TABLE IF NOT EXISTS "task_history" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "state" "TaskState" NOT NULL,
  "title" TEXT NOT NULL,
  "instruction" TEXT NOT NULL,
  "difficulty" "Difficulty" NOT NULL,
  "categories" TEXT NOT NULL,
  "maxAgentTimeoutSec" INTEGER NOT NULL,
  "maxTestTimeoutSec" INTEGER NOT NULL,
  "taskYaml" TEXT,
  "dockerComposeYaml" TEXT,
  "solutionSh" TEXT,
  "runTestsSh" TEXT,
  "testsJson" TEXT,
  "changedBy" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "users_clerkId_idx" ON "users"("clerkId");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "tasks_authorId_idx" ON "tasks"("authorId");
CREATE INDEX IF NOT EXISTS "tasks_state_idx" ON "tasks"("state");
CREATE INDEX IF NOT EXISTS "tasks_reviewerId_idx" ON "tasks"("reviewerId");
CREATE INDEX IF NOT EXISTS "reviews_taskId_idx" ON "reviews"("taskId");
CREATE INDEX IF NOT EXISTS "reviews_reviewerId_idx" ON "reviews"("reviewerId");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "task_history_taskId_version_idx" ON "task_history"("taskId", "version");
CREATE INDEX IF NOT EXISTS "task_history_taskId_createdAt_idx" ON "task_history"("taskId", "createdAt");