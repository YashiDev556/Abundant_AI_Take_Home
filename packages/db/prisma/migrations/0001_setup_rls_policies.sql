-- Optional: Row Level Security (RLS) Policies for Clerk Integration
-- Run this in Supabase SQL Editor if you want to use RLS with Clerk
-- Reference: https://clerk.com/docs/guides/development/integrations/databases/supabase

-- Enable RLS on users table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own record
CREATE POLICY "Users can view their own data"
ON "public"."users"
FOR SELECT
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = "clerkId"
);

-- Policy: Users can update their own record
CREATE POLICY "Users can update their own data"
ON "public"."users"
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = "clerkId"
);

-- Note: INSERT policy not needed if you're creating users via Prisma with application-level auth
-- The Clerk session token's 'sub' claim contains the Clerk user ID
