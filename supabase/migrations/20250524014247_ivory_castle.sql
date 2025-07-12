/*
  # Add Admin Role and Audit Logging

  1. Changes
    - Add admin role to profiles
    - Create function to increment balance
    - Add audit logging for admin actions
  
  2. Security
    - Maintains existing RLS policies
    - Adds proper audit trail for admin actions
*/

BEGIN;

-- Update profiles type check to include admin
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_type_check,
  ADD CONSTRAINT profiles_type_check CHECK (type IN ('donor', 'charity', 'admin'));

-- Create function to increment balance safely
CREATE OR REPLACE FUNCTION increment_balance(row_id uuid, amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance numeric;
  new_balance numeric;
BEGIN
  -- Get current balance
  SELECT available_balance INTO current_balance
  FROM charity_details
  WHERE profile_id = row_id;
  
  -- Calculate new balance
  new_balance := current_balance + amount;
  
  -- Return new balance
  RETURN new_balance;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error incrementing balance: %', SQLERRM;
END;
$$;

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE
      WHEN TG_OP = 'INSERT' THEN NULL
      ELSE row_to_json(OLD)
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN NULL
      ELSE row_to_json(NEW)
    END,
    NULL, -- IP address would be set by the application
    NULL  -- User agent would be set by the application
  );
  
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error logging admin action: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Create triggers for tables that should be audited
DO $$ 
BEGIN
  -- Create trigger for charity_details
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'log_charity_details_changes'
  ) THEN
    CREATE TRIGGER log_charity_details_changes
      AFTER INSERT OR UPDATE OR DELETE ON charity_details
      FOR EACH ROW
      EXECUTE FUNCTION log_admin_action();
  END IF;
  
  -- Create trigger for profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'log_profiles_changes'
  ) THEN
    CREATE TRIGGER log_profiles_changes
      AFTER INSERT OR UPDATE OR DELETE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION log_admin_action();
  END IF;
  
  -- Create trigger for withdrawal_requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'log_withdrawal_requests_changes'
  ) THEN
    CREATE TRIGGER log_withdrawal_requests_changes
      AFTER INSERT OR UPDATE OR DELETE ON withdrawal_requests
      FOR EACH ROW
      EXECUTE FUNCTION log_admin_action();
  END IF;
END $$;

COMMIT;