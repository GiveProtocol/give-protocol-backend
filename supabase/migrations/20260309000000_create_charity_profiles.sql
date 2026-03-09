-- Create charity_profiles and charity_nominations tables
-- with get_or_create_charity_profile RPC function

-- charity_profiles table
CREATE TABLE IF NOT EXISTS charity_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ein TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mission TEXT,
  location TEXT,
  website TEXT,
  logo_url TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  ntee_code TEXT,
  founded TEXT,
  irs_status TEXT,
  employees INTEGER,
  status TEXT NOT NULL DEFAULT 'unclaimed'
    CHECK (status IN ('unclaimed', 'claimed-pending', 'verified')),
  nominations_count INTEGER DEFAULT 0,
  interested_donors_count INTEGER DEFAULT 0,
  authorized_signer_name TEXT,
  authorized_signer_title TEXT,
  authorized_signer_email TEXT,
  wallet_address TEXT,
  wallet_type TEXT CHECK (wallet_type IN ('new_custodial', 'existing_evm')),
  payment_processor TEXT CHECK (payment_processor IN ('helcim', 'stripe', 'paypal')),
  claimed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_charity_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER charity_profiles_updated_at
  BEFORE UPDATE ON charity_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_charity_profiles_updated_at();

-- RLS for charity_profiles: public read, service_role write
ALTER TABLE charity_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "charity_profiles_select_public"
  ON charity_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "charity_profiles_all_service_role"
  ON charity_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- charity_nominations table
CREATE TABLE IF NOT EXISTS charity_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id UUID NOT NULL REFERENCES charity_profiles(id) ON DELETE CASCADE,
  nominator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for charity_nominations
ALTER TABLE charity_nominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "charity_nominations_insert_authenticated"
  ON charity_nominations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "charity_nominations_select_own"
  ON charity_nominations FOR SELECT
  TO authenticated
  USING (nominator_email = (SELECT auth.email()));

CREATE POLICY "charity_nominations_all_service_role"
  ON charity_nominations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- get_or_create_charity_profile RPC
CREATE OR REPLACE FUNCTION get_or_create_charity_profile(lookup_ein TEXT)
RETURNS SETOF charity_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_profile charity_profiles;
  irs_row RECORD;
BEGIN
  -- 1. Check if profile already exists
  SELECT * INTO found_profile
  FROM charity_profiles
  WHERE ein = lookup_ein;

  IF FOUND THEN
    RETURN NEXT found_profile;
    RETURN;
  END IF;

  -- 2. Look up IRS data
  SELECT * INTO irs_row
  FROM irs_organizations
  WHERE ein = lookup_ein;

  IF NOT FOUND THEN
    -- No IRS record; return empty set
    RETURN;
  END IF;

  -- 3. Seed a new unclaimed profile from IRS data
  INSERT INTO charity_profiles (ein, name, location, ntee_code, irs_status)
  VALUES (
    irs_row.ein,
    irs_row.name,
    CONCAT_WS(', ', irs_row.city, irs_row.state, irs_row.zip),
    irs_row.ntee_cd,
    irs_row.status
  )
  ON CONFLICT (ein) DO NOTHING;

  -- 4. Re-select to handle race condition
  RETURN QUERY
  SELECT * FROM charity_profiles WHERE ein = lookup_ein;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_or_create_charity_profile(TEXT) TO anon, authenticated;
