-- Update OTP expiry time in auth configuration tables
DO $$
BEGIN
  -- Try to update auth.config table if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'config'
  ) THEN
    UPDATE auth.config
    SET otp_exp = 900  -- 15 minutes in seconds (default)
    WHERE id = 1;
  END IF;
  
  -- If auth.config doesn't exist, try to update the setting in the instance settings
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'instance'
  ) THEN
    UPDATE auth.instance
    SET raw_base_config = jsonb_set(
      COALESCE(raw_base_config, '{}'::jsonb),
      '{otp_exp}',
      to_jsonb(900)
    )
    WHERE id = 1;
  END IF;
  
  -- Skip audit log entry creation to avoid null value constraint error
END $$;