/*
  # Add Admin Profile Type

  1. Changes
    - Update profiles table type constraint to include 'admin'
    - This allows users to have admin profile type in addition to donor/charity
  
  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity
*/

BEGIN;

-- Update the type constraint to include 'admin'
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_type_check,
  ADD CONSTRAINT profiles_type_check 
    CHECK (type IN ('donor', 'charity', 'admin'));

COMMIT;