-- Fix remaining RLS performance issues
-- Addresses 29 remaining performance issues from Supabase linter

-- =========================================
-- REMAINING RLS AUTH ISSUES (16 issues)
-- =========================================

-- Fix profile_update_approvals policies that weren't properly updated
DROP POLICY IF EXISTS "Charities can view their own profile update approvals" ON profile_update_approvals;
CREATE POLICY "Charities can view their own profile update approvals"
  ON profile_update_approvals
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

DROP POLICY IF EXISTS "Charities can create profile update requests" ON profile_update_approvals;
CREATE POLICY "Charities can create profile update requests"
  ON profile_update_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

DROP POLICY IF EXISTS "Admins can view all profile update approvals" ON profile_update_approvals;
CREATE POLICY "Admins can view all profile update approvals"
  ON profile_update_approvals
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can update profile update approvals" ON profile_update_approvals;
CREATE POLICY "Admins can update profile update approvals"
  ON profile_update_approvals
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));

-- Fix donations policy that wasn't properly updated
DROP POLICY IF EXISTS "Users can view their own donations" ON donations;
CREATE POLICY "Users can view their own donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Fix user_skills policies
DROP POLICY IF EXISTS "Users can read own skills" ON user_skills;
CREATE POLICY "Users can read own skills"
  ON user_skills
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage own skills" ON user_skills;
CREATE POLICY "Users can manage own skills"
  ON user_skills
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix wallet_aliases policy
DROP POLICY IF EXISTS "Users can manage their own wallet aliases" ON wallet_aliases;
CREATE POLICY "Users can manage their own wallet aliases"
  ON wallet_aliases
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix donor_profiles policies
DROP POLICY IF EXISTS "Donors can read own profile" ON donor_profiles;
CREATE POLICY "Donors can read own profile"
  ON donor_profiles
  FOR SELECT
  TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'donor'
  ));

DROP POLICY IF EXISTS "Donors can update own profile" ON donor_profiles;
CREATE POLICY "Donors can update own profile"
  ON donor_profiles
  FOR UPDATE
  TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'donor'
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'donor'
  ));

-- Fix user_preferences policy
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix impact_metrics policy
DROP POLICY IF EXISTS "Charities can create own impact metrics" ON impact_metrics;
CREATE POLICY "Charities can create own impact metrics"
  ON impact_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- Fix skill_endorsements policy
DROP POLICY IF EXISTS "Users can create endorsements" ON skill_endorsements;
CREATE POLICY "Users can create endorsements"
  ON skill_endorsements
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = endorsed_by);

-- Fix charity_details policy
DROP POLICY IF EXISTS "Charities can update own details" ON charity_details;
CREATE POLICY "Charities can update own details"
  ON charity_details
  FOR UPDATE
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ))
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- Fix volunteer_profiles policies
DROP POLICY IF EXISTS "Admins can view all volunteer profiles" ON volunteer_profiles;
CREATE POLICY "Admins can view all volunteer profiles"
  ON volunteer_profiles
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));

DROP POLICY IF EXISTS "Charities can view volunteer profiles of applicants" ON volunteer_profiles;
CREATE POLICY "Charities can view volunteer profiles of applicants"
  ON volunteer_profiles
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM volunteer_applications va
    JOIN volunteer_opportunities vo ON va.opportunity_id = vo.id
    WHERE va.applicant_id = volunteer_profiles.id
      AND vo.charity_id IN (
        SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
      )
  ));

-- =========================================
-- CONSOLIDATE MULTIPLE PERMISSIVE POLICIES (13 issues)
-- =========================================

-- 1. Fix donations table - consolidate "Users can view relevant donations" and "Users can view their own donations"
DROP POLICY IF EXISTS "Users can view relevant donations" ON donations;
DROP POLICY IF EXISTS "Users can view their own donations" ON donations;
CREATE POLICY "Users can view relevant donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own donations (if user_id exists)
    (user_id IS NOT NULL AND (SELECT auth.uid()) = user_id)
    OR
    -- Donors can read donations they made
    donor_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'donor'
    )
    OR
    -- Charities can read donations they received
    charity_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  );

-- 2. Fix profile_update_approvals - consolidate admin and charity policies
DROP POLICY IF EXISTS "Admins can view all profile update approvals" ON profile_update_approvals;
DROP POLICY IF EXISTS "Charities can view their own profile update approvals" ON profile_update_approvals;
CREATE POLICY "Admins and charities can view profile update approvals"
  ON profile_update_approvals
  FOR SELECT
  TO authenticated
  USING (
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
    )
    OR
    -- Charity can view their own
    charity_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  );

-- 3. Fix user_skills - consolidate read and manage policies
DROP POLICY IF EXISTS "Users can read own skills" ON user_skills;
DROP POLICY IF EXISTS "Users can manage own skills" ON user_skills;
CREATE POLICY "Users can manage own skills"
  ON user_skills
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. Fix volunteer_applications - consolidate user and charity view policies
DROP POLICY IF EXISTS "Users can view own applications" ON volunteer_applications;
DROP POLICY IF EXISTS "Charities can view applications for their opportunities" ON volunteer_applications;
CREATE POLICY "Users and charities can view applications"
  ON volunteer_applications
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own applications
    applicant_id IN (
      SELECT id FROM volunteer_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR
    -- Charities can view applications for their opportunities
    opportunity_id IN (
      SELECT id FROM volunteer_opportunities
      WHERE charity_id IN (
        SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
      )
    )
  );

-- 5. Fix volunteer_opportunities - consolidate public read and charity manage
DROP POLICY IF EXISTS "Anyone can read active opportunities" ON volunteer_opportunities;
DROP POLICY IF EXISTS "Charities can manage own opportunities" ON volunteer_opportunities;

-- Create separate policies for different operations
CREATE POLICY "Anyone can read active opportunities"
  ON volunteer_opportunities
  FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Charities can manage own opportunities"
  ON volunteer_opportunities
  FOR ALL
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ))
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- 6. Fix volunteer_profiles - consolidate multiple view policies
DROP POLICY IF EXISTS "Users can view their own volunteer profile" ON volunteer_profiles;
DROP POLICY IF EXISTS "Admins can view all volunteer profiles" ON volunteer_profiles;
DROP POLICY IF EXISTS "Charities can view volunteer profiles of applicants" ON volunteer_profiles;
CREATE POLICY "Users, admins, and charities can view volunteer profiles"
  ON volunteer_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own profile
    (SELECT auth.uid()) = user_id
    OR
    -- Admins can view all profiles
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
    )
    OR
    -- Charities can view profiles of applicants
    EXISTS (
      SELECT 1 FROM volunteer_applications va
      JOIN volunteer_opportunities vo ON va.opportunity_id = vo.id
      WHERE va.applicant_id = volunteer_profiles.id
        AND vo.charity_id IN (
          SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
        )
    )
  );

-- 7. Fix wallet_aliases - consolidate read and manage policies
DROP POLICY IF EXISTS "Anyone can read wallet aliases" ON wallet_aliases;
DROP POLICY IF EXISTS "Users can manage their own wallet aliases" ON wallet_aliases;

-- Create separate policies for different operations
CREATE POLICY "Anyone can read wallet aliases"
  ON wallet_aliases
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own wallet aliases"
  ON wallet_aliases
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);