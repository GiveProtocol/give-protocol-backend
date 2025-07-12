/*
  # Fix Profile Policies and Add Recovery

  1. Security
    - Update RLS policies for better access control
    - Add profile recovery mechanism
  
  2. Changes
    - Drop and recreate policies with proper checks
    - Add function to ensure profile exists
*/

-- Disable RLS temporarily for migration
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new policies with proper checks
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to ensure profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS trigger AS $$
DECLARE
  user_type text;
BEGIN
  -- Get user type from metadata or default to 'donor'
  user_type := COALESCE(
    (SELECT raw_user_meta_data->>'type' 
     FROM auth.users 
     WHERE id = auth.uid()),
    'donor'
  );

  -- Insert profile if it doesn't exist
  INSERT INTO public.profiles (user_id, type)
  VALUES (auth.uid(), user_type)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;