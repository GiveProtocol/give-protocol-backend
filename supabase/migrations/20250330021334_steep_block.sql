/*
  # Update Volunteer Hours Function
  
  1. Changes
    - Add fixed search path to function
    - Change to SECURITY INVOKER
    - Improve error handling
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_total_volunteer_hours;

-- Create updated function with fixed search path
CREATE OR REPLACE FUNCTION public.get_total_volunteer_hours(user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  total_hours numeric;
BEGIN
  SELECT COALESCE(SUM(hours), 0)
  INTO total_hours
  FROM volunteer_hours
  WHERE volunteer_id = user_id
  AND status = 'approved';

  RETURN total_hours;

EXCEPTION WHEN OTHERS THEN
  -- Log error and return 0
  RAISE WARNING 'Error in get_total_volunteer_hours: %', SQLERRM;
  RETURN 0;
END;
$$;