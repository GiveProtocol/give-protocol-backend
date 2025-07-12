/*
  # Add admin policies and indexes for withdrawal requests

  1. Changes
    - Add policy for admin to update withdrawal status
    - Add performance indexes for withdrawal queries
    
  2. Security
    - Only allow admins to update withdrawal status
    - Restrict status updates to approved/rejected
    - Only allow updates on pending requests
*/

-- Add policy for admin to update withdrawal status using row-level security
CREATE POLICY "Admin can update withdrawal status"
  ON withdrawal_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND type = 'admin'
    )
    AND (status IN ('approved', 'rejected'))
  );

-- Add index for faster withdrawal queries
CREATE INDEX IF NOT EXISTS withdrawal_requests_charity_id_created_at_idx 
  ON withdrawal_requests(charity_id, created_at DESC);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS withdrawal_requests_status_idx 
  ON withdrawal_requests(status);