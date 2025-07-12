/*
  # Fix Database Functions and Add Security Improvements

  1. Changes
    - Fix all database functions with proper search paths
    - Add proper error handling
    - Add security context (SECURITY DEFINER/INVOKER)
    - Fix return types and parameters
  
  2. Security
    - Prevent SQL injection via search_path
    - Add proper error handling
    - Use explicit schema references
*/

-- Fix check_charity_profile function
CREATE OR REPLACE FUNCTION public.check_charity_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.charity_id AND type = 'charity'
  ) THEN
    RAISE EXCEPTION 'Only charity profiles can request withdrawals';
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error in check_charity_profile: %', SQLERRM;
END;
$$;

-- Fix validate_withdrawal_amount function
CREATE OR REPLACE FUNCTION public.validate_withdrawal_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available NUMERIC;
BEGIN
  SELECT available_balance INTO available
  FROM public.charity_details 
  WHERE profile_id = NEW.charity_id;

  IF available IS NULL THEN
    RAISE EXCEPTION 'Charity details not found for charity_id %', NEW.charity_id;
  END IF;

  IF NEW.amount > available THEN
    RAISE EXCEPTION 'Withdrawal amount (%) exceeds available balance (%)', NEW.amount, available;
  END IF;
  
  -- Update available balance
  UPDATE public.charity_details
  SET available_balance = available_balance - NEW.amount
  WHERE profile_id = NEW.charity_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error in validate_withdrawal_amount: %', SQLERRM;
END;
$$;

-- Fix update_charity_balances function
CREATE OR REPLACE FUNCTION public.update_charity_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Check if charity_details record exists
    IF NOT EXISTS (
      SELECT 1 FROM public.charity_details WHERE profile_id = NEW.charity_id
    ) THEN
      -- Create charity_details record if it doesn't exist
      INSERT INTO public.charity_details (
        profile_id, 
        name, 
        description, 
        category, 
        total_received, 
        available_balance
      )
      VALUES (
        NEW.charity_id,
        'New Charity', -- Default name
        'Charity description pending', -- Default description
        'Other', -- Default category
        NEW.amount, -- Initial total_received
        NEW.amount  -- Initial available_balance
      );
    ELSE
      -- Update existing charity_details record
      UPDATE public.charity_details
      SET 
        total_received = total_received + NEW.amount,
        available_balance = available_balance + NEW.amount
      WHERE profile_id = NEW.charity_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.charity_details
    SET 
      total_received = GREATEST(0, total_received - OLD.amount),
      available_balance = GREATEST(0, available_balance - OLD.amount)
    WHERE profile_id = OLD.charity_id;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in update_charity_balances: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_type text;
BEGIN
  -- Extract type from metadata with validation
  user_type := COALESCE(
    (new.raw_user_meta_data->>'type')::text,
    'donor'  -- Default to donor if no type specified
  );
  
  -- Validate user_type
  IF user_type NOT IN ('donor', 'charity', 'admin') THEN
    user_type := 'donor'; -- Default to donor for invalid types
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, type)
  VALUES (new.id, user_type)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$;

-- Fix create_profile_for_user function
CREATE OR REPLACE FUNCTION public.create_profile_for_user(
  user_id uuid,
  user_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate user_type
  IF user_type NOT IN ('donor', 'charity', 'admin') THEN
    user_type := 'donor'; -- Default to donor for invalid types
  END IF;

  INSERT INTO public.profiles (user_id, type)
  VALUES (user_id, user_type)
  ON CONFLICT (user_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in create_profile_for_user: %', SQLERRM;
END;
$$;

-- Fix ensure_user_profile function
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Validate user_type
  IF user_type NOT IN ('donor', 'charity', 'admin') THEN
    user_type := 'donor'; -- Default to donor for invalid types
  END IF;

  -- Insert profile if it doesn't exist
  INSERT INTO public.profiles (user_id, type)
  VALUES (auth.uid(), user_type)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in ensure_user_profile: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in update_updated_at_column: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Fix update_user_preferences_updated_at function
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in update_user_preferences_updated_at: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Fix get_total_volunteer_hours function
CREATE OR REPLACE FUNCTION public.get_total_volunteer_hours(user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  total_hours numeric;
BEGIN
  SELECT COALESCE(SUM(hours), 0)
  INTO total_hours
  FROM public.volunteer_hours
  WHERE volunteer_id = user_id
  AND status = 'approved';

  RETURN total_hours;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in get_total_volunteer_hours: %', SQLERRM;
  RETURN 0;
END;
$$;

-- Fix get_user_endorsements_count function
CREATE OR REPLACE FUNCTION public.get_user_endorsements_count(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  endorsement_count integer;
BEGIN
  SELECT COUNT(*)
  INTO endorsement_count
  FROM public.skill_endorsements
  WHERE recipient_id = user_id;

  RETURN COALESCE(endorsement_count, 0);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in get_user_endorsements_count: %', SQLERRM;
  RETURN 0;
END;
$$;

-- Fix verify_volunteer_hash function
CREATE OR REPLACE FUNCTION public.verify_volunteer_hash(hash_to_verify text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validate input
  IF hash_to_verify IS NULL OR hash_to_verify = '' THEN
    RETURN json_build_object('exists', false, 'error', 'Invalid hash')::jsonb;
  END IF;

  SELECT json_build_object(
    'exists', true,
    'verification', row_to_json(v),
    'applicant', row_to_json(a),
    'opportunity', row_to_json(o),
    'charity', row_to_json(c)
  )::jsonb INTO result
  FROM public.volunteer_verifications v
  LEFT JOIN public.profiles a ON v.applicant_id = a.id
  LEFT JOIN public.volunteer_opportunities o ON v.opportunity_id = o.id
  LEFT JOIN public.profiles c ON v.charity_id = c.id
  WHERE v.acceptance_hash = hash_to_verify OR v.verification_hash = hash_to_verify
  LIMIT 1;

  IF result IS NULL THEN
    RETURN json_build_object('exists', false)::jsonb;
  END IF;

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'exists', false,
    'error', SQLERRM
  )::jsonb;
END;
$$;