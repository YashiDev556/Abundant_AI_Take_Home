-- SQL script to create tables manually via Supabase SQL Editor
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- This matches your Prisma schema

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clerkId" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on clerkId for faster lookups
CREATE INDEX IF NOT EXISTS "users_clerkId_idx" ON "users"("clerkId");

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

-- Add comment
COMMENT ON TABLE "users" IS 'User table synced with Clerk authentication';
