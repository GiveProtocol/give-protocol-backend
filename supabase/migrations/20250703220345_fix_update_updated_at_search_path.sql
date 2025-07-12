/*
  # Fix Search Path for update_updated_at_column Function

  1. Security Fix
    - Set immutable search_path for update_updated_at_column function
    - This prevents potential security vulnerabilities from search path manipulation
    
  2. Changes
    - Recreate function with SET search_path = '' to make it immutable
    - Function will always use fully qualified names
*/

-- Drop and recreate the function with immutable search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;