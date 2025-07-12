/*
  # Fix Foreign Key Constraints

  1. Changes
    - Remove existing sample data that violates constraints
    - Add proper foreign key handling with CASCADE options
    - Update profiles table constraints
  
  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity
*/

BEGIN;

-- First clean up any orphaned records
DELETE FROM profiles WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Update the foreign key constraint to handle cascading
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
  ADD CONSTRAINT profiles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- Add a check to prevent duplicate user profiles
ALTER TABLE profiles
  ADD CONSTRAINT unique_user_profile UNIQUE (user_id);

-- Add an index to improve foreign key lookup performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

COMMIT;