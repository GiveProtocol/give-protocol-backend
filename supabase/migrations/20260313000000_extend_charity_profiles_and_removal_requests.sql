-- Extend charity_profiles with additional editable/claimable fields
-- and create removal_requests table for profile removal requests.

-- Add supplementary columns to charity_profiles
ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS mission_statement TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_1_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_2_url TEXT,
  ADD COLUMN IF NOT EXISTS social_twitter TEXT,
  ADD COLUMN IF NOT EXISTS social_linkedin TEXT,
  ADD COLUMN IF NOT EXISTS social_facebook TEXT;

-- Allow claimed charity to update their own profile
CREATE POLICY "charity_profiles_update_own"
  ON charity_profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = claimed_by_user_id);

-- removal_requests table
CREATE TABLE IF NOT EXISTS removal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ein TEXT NOT NULL,
  reason TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE removal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "removal_requests_insert_public"
  ON removal_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "removal_requests_select_service_role"
  ON removal_requests FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "removal_requests_all_service_role"
  ON removal_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
