-- Migration: Add TASK_DELETED to AuditAction enum
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- Or apply via: ALTER TYPE "AuditAction" ADD VALUE 'TASK_DELETED';

-- Add TASK_DELETED to the AuditAction enum if it doesn't exist
DO $$ 
BEGIN
  -- Check if TASK_DELETED already exists in the enum
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'TASK_DELETED' 
    AND enumtypid = (
      SELECT oid 
      FROM pg_type 
      WHERE typname = 'AuditAction'
    )
  ) THEN
    -- Add TASK_DELETED to the enum
    ALTER TYPE "AuditAction" ADD VALUE 'TASK_DELETED';
  END IF;
END $$;
