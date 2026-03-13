-- Add claimed_by and authorized_signer_phone columns to charity_profiles
-- and create claim_charity_profile RPC function

-- 1a. Add new columns
ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS authorized_signer_phone TEXT;

-- 1b. Create claim_charity_profile RPC
CREATE OR REPLACE FUNCTION claim_charity_profile(
  p_ein TEXT,
  p_signer_name TEXT,
  p_signer_email TEXT,
  p_signer_phone TEXT
)
RETURNS SETOF charity_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile charity_profiles;
BEGIN
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify profile exists and is unclaimed
  IF NOT EXISTS (
    SELECT 1 FROM charity_profiles
    WHERE ein = p_ein AND status = 'unclaimed'
  ) THEN
    RAISE EXCEPTION 'Profile not found or already claimed';
  END IF;

  -- Atomic update with status guard against race conditions
  UPDATE charity_profiles
  SET
    status = 'claimed-pending',
    authorized_signer_name = p_signer_name,
    authorized_signer_email = p_signer_email,
    authorized_signer_phone = p_signer_phone,
    claimed_by = auth.uid(),
    claimed_at = now()
  WHERE ein = p_ein
    AND status = 'unclaimed'
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim failed — profile was claimed by another user';
  END IF;

  RETURN NEXT updated_profile;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated;
