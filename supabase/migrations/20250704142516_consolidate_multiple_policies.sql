-- Consolidate multiple permissive policies for better performance
-- This fixes 12 multiple permissive policy issues

-- =========================================
-- CHARITY_APPROVALS TABLE
-- =========================================
-- Consolidate "Admins can view all charity approvals" and "Charities can view their own approvals"
-- into a single policy

DROP POLICY IF EXISTS "Admins can view all charity approvals" ON charity_approvals;
DROP POLICY IF EXISTS "Charities can view their own approvals" ON charity_approvals;

CREATE POLICY "Admins and charities can view charity approvals"
  ON charity_approvals
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

-- =========================================
-- DONATIONS TABLE
-- =========================================
-- Consolidate overlapping donation view policies

DROP POLICY IF EXISTS "Users can view their own donations" ON donations;
DROP POLICY IF EXISTS "Donors can read own donations" ON donations;
DROP POLICY IF EXISTS "Charities can read received donations" ON donations;

CREATE POLICY "Users can view relevant donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own donations
    (SELECT auth.uid()) = user_id
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

-- =========================================
-- PROFILE_UPDATE_APPROVALS TABLE
-- =========================================
-- Consolidate admin and charity view policies

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

-- =========================================
-- USER_SKILLS TABLE
-- =========================================
-- Consolidate read and manage policies

DROP POLICY IF EXISTS "Users can read own skills" ON user_skills;
DROP POLICY IF EXISTS "Users can manage own skills" ON user_skills;

CREATE POLICY "Users can manage own skills"
  ON user_skills
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- =========================================
-- VOLUNTEER_APPLICATIONS TABLE
-- =========================================
-- Consolidate user and charity view policies

DROP POLICY IF EXISTS "Users can view own applications" ON volunteer_applications;
DROP POLICY IF EXISTS "Charities can view applications for their opportunities" ON volunteer_applications;

CREATE POLICY "Users and charities can view applications"
  ON volunteer_applications
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own applications
    applicant_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())
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

-- =========================================
-- VOLUNTEER_OPPORTUNITIES TABLE
-- =========================================
-- Consolidate public read and charity manage policies

DROP POLICY IF EXISTS "Anyone can read active opportunities" ON volunteer_opportunities;
DROP POLICY IF EXISTS "Charities can manage own opportunities" ON volunteer_opportunities;

-- Separate policies for different operations
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

-- =========================================
-- VOLUNTEER_PROFILES TABLE
-- =========================================
-- Consolidate multiple view policies

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

-- =========================================
-- WALLET_ALIASES TABLE
-- =========================================
-- Consolidate read and manage policies

DROP POLICY IF EXISTS "Anyone can read wallet aliases" ON wallet_aliases;
DROP POLICY IF EXISTS "Users can manage their own wallet aliases" ON wallet_aliases;

-- Separate policies for different operations
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