-- Revert OTP expiry time to 15 minutes (900 seconds)

DO $$
BEGIN
  -- Check if auth.config table exists
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'auth' AND tablename = 'config'
  ) THEN
    -- Update auth.config table
    UPDATE auth.config
    SET otp_exp = 900
    WHERE id = 1;

    -- Check if the update was successful
    IF FOUND THEN
      -- Log the change in the audit log if the table exists
      IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'auth' AND tablename = 'audit_log_entries'
      ) THEN
        INSERT INTO auth.audit_log_entries (instance_id, payload, created_at, ip_address)
        VALUES (
          '00000000-0000-0000-0000-000000000000',
          '{"action": "update_auth_settings", "changes": {"otp_exp": 900}}',
          now(),
          '127.0.0.1'
        );
      END IF;
    END IF;
  ELSE
    -- If auth.config doesn't exist, try to update the setting in the instance settings
    IF EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'auth' AND tablename = 'instance'
    ) THEN
      -- Update the setting in the gotrue settings table if it exists
      UPDATE auth.instance
      SET raw_base_config = jsonb_set(
        COALESCE(raw_base_config, '{}'::jsonb),
        '{otp_exp}',
        to_jsonb(900)
      )
      WHERE id = 1;

      -- Check if the update was successful
      IF FOUND THEN
        -- Log the change in the audit log if the table exists
        IF EXISTS (
          SELECT 1
          FROM pg_tables
          WHERE schemaname = 'auth' AND tablename = 'audit_log_entries'
        ) THEN
          INSERT INTO auth.audit_log_entries (instance_id, payload, created_at, ip_address)
          VALUES (
            '00000000-0000-0000-0000-000000000000',
            '{"action": "update_auth_settings", "changes": {"otp_exp": 900}}',
            now(),
            '127.0.0.1'
          );
        END IF;
      END IF;
    END IF;
  END IF;
END $$;