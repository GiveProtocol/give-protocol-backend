/*
  # Update Functions with Fixed Search Paths
  
  1. Changes
    - Add fixed search paths to all functions
    - Change to SECURITY INVOKER where appropriate
    - Improve error handling
    - Modify functions in place instead of dropping/recreating
*/

-- Update get_user_endorsements_count function
CREATE OR REPLACE FUNCTION public.get_user_endorsements_count(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  endorsement_count integer;
BEGIN
  SELECT COUNT(*)
  INTO endorsement_count
  FROM skill_endorsements
  WHERE recipient_id = user_id;

  RETURN COALESCE(endorsement_count, 0);

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in get_user_endorsements_count: %', SQLERRM;
  RETURN 0;
END;
$$;

-- Update create_profile_for_user function
CREATE OR REPLACE FUNCTION public.create_profile_for_user(
  user_id uuid,
  user_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO profiles (user_id, type)
  VALUES (user_id, user_type)
  ON CONFLICT (user_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in create_profile_for_user: %', SQLERRM;
END;
$$;

-- Update handle_new_user function without dropping
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.create_profile_for_user(
    new.id,
    COALESCE(
      (new.raw_user_meta_data->>'type')::text,
      'donor'
    )
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$;

-- Update ensure_user_profile function
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_type text;
BEGIN
  user_type := COALESCE(
    (SELECT raw_user_meta_data->>'type' 
     FROM auth.users 
     WHERE id = auth.uid()),
    'donor'
  );

  INSERT INTO profiles (user_id, type)
  VALUES (auth.uid(), user_type)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in ensure_user_profile: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in update_updated_at_column: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Update validate_withdrawal_amount function
CREATE OR REPLACE FUNCTION public.validate_withdrawal_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  available numeric;
BEGIN
  SELECT available_balance INTO available
  FROM charity_details 
  WHERE profile_id = NEW.charity_id;

  IF NEW.amount > available THEN
    RAISE EXCEPTION 'Withdrawal amount (%) exceeds available balance (%)', NEW.amount, available;
  END IF;
  
  UPDATE charity_details
  SET available_balance = available_balance - NEW.amount
  WHERE profile_id = NEW.charity_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in validate_withdrawal_amount: %', SQLERRM;
  RAISE;
END;
$$;

-- Update update_charity_balances function
CREATE OR REPLACE FUNCTION public.update_charity_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE charity_details
    SET 
      total_received = total_received + NEW.amount,
      available_balance = available_balance + NEW.amount
    WHERE profile_id = NEW.charity_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE charity_details
    SET 
      total_received = total_received - OLD.amount,
      available_balance = available_balance - OLD.amount
    WHERE profile_id = OLD.charity_id;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in update_charity_balances: %', SQLERRM;
  RETURN NULL;
END;
$$;