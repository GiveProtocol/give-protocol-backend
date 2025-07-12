/*
  # Fix RLS Performance for profiles Table

  1. Performance Optimization
    - Wrap auth.uid() calls in subqueries to prevent re-evaluation for every row
    - This caches the auth.uid() result for the duration of the query
    
  2. Changes
    - Update "Users can insert own profile" policy
    - Update "Users can update own profile" policy
    - Update "Anyone can read profiles" policy (though SELECT policies are less affected)
    - All policies now use (SELECT auth.uid()) instead of direct auth.uid() calls
*/

-- Fix the INSERT policy for better performance
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix the UPDATE policy for better performance
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- The SELECT policy doesn't use auth.uid() so no change needed
-- Policy "Anyone can read profiles" remains as: USING (true)