/*
  # Fix RLS Performance for withdrawal_requests Table

  1. Performance Optimization
    - Wrap auth.uid() calls in subqueries to prevent re-evaluation for every row
    - This caches the auth.uid() result for the duration of the query
    
  2. Changes
    - Update "Charities can create withdrawals" policy
    - Update "Charities can view own withdrawals" policy
    - Both policies now use (SELECT auth.uid()) instead of direct auth.uid() calls
*/

-- Fix the INSERT policy for better performance
DROP POLICY IF EXISTS "Charities can create withdrawals" ON withdrawal_requests;
CREATE POLICY "Charities can create withdrawals"
  ON withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- Fix the SELECT policy for better performance
DROP POLICY IF EXISTS "Charities can view own withdrawals" ON withdrawal_requests;
CREATE POLICY "Charities can view own withdrawals"
  ON withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));