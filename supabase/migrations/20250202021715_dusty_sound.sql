/*
  # Update Profile Permissions and Triggers

  1. Security
    - Update RLS policies for profiles table
    - Add safer profile creation handling
  
  2. Changes
    - Drop existing policies
    - Create new public read policy
    - Add profile management policies
    - Create profile handling function
*/

-- Disable RLS temporarily for migration
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function for profile management
CREATE OR REPLACE FUNCTION public.create_profile_for_user(
  user_id uuid,
  user_type text
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (user_id, type)
  VALUES (user_id, user_type)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;