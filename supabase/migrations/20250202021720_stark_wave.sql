/*
  # Add Profile Creation Trigger Function
  
  1. Changes
    - Create function to handle new user registration
    - Add trigger to automatically create profile
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Extract type from metadata and create profile
  PERFORM public.create_profile_for_user(
    new.id,
    COALESCE(
      (new.raw_user_meta_data->>'type')::text,
      'donor'  -- Default to donor if no type specified
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DO $$
BEGIN
  -- Safely drop trigger if it exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
  
  -- Create new trigger
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
END $$;