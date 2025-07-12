-- Fix RLS performance issues by wrapping auth.uid() in subqueries
-- This prevents auth.uid() from being re-evaluated for each row
-- Fixes 66 auth RLS initialization plan issues

-- =========================================
-- WITHDRAWAL_REQUESTS TABLE
-- =========================================

-- Charities can create withdrawals
DROP POLICY IF EXISTS "Charities can create withdrawals" ON withdrawal_requests;
CREATE POLICY "Charities can create withdrawals"
  ON withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- Admin can update withdrawal status
DROP POLICY IF EXISTS "Admin can update withdrawal status" ON withdrawal_requests;
CREATE POLICY "Admin can update withdrawal status"
  ON withdrawal_requests
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));

-- Charities can view own withdrawals
DROP POLICY IF EXISTS "Charities can view own withdrawals" ON withdrawal_requests;
CREATE POLICY "Charities can view own withdrawals"
  ON withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- =========================================
-- PROFILES TABLE
-- =========================================

-- Users can insert own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- =========================================
-- DONATIONS TABLE
-- =========================================

-- Users can view their own donations
DROP POLICY IF EXISTS "Users can view their own donations" ON donations;
CREATE POLICY "Users can view their own donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Donors can read own donations
DROP POLICY IF EXISTS "Donors can read own donations" ON donations;
CREATE POLICY "Donors can read own donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING (donor_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'donor'
  ));

-- Charities can read received donations
DROP POLICY IF EXISTS "Charities can read received donations" ON donations;
CREATE POLICY "Charities can read received donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- =========================================
-- VOLUNTEER_PROFILES TABLE
-- =========================================

-- Users can view their own volunteer profile
DROP POLICY IF EXISTS "Users can view their own volunteer profile" ON volunteer_profiles;
CREATE POLICY "Users can view their own volunteer profile"
  ON volunteer_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Users can create their own volunteer profile
DROP POLICY IF EXISTS "Users can create their own volunteer profile" ON volunteer_profiles;
CREATE POLICY "Users can create their own volunteer profile"
  ON volunteer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can update their own volunteer profile
DROP POLICY IF EXISTS "Users can update their own volunteer profile" ON volunteer_profiles;
CREATE POLICY "Users can update their own volunteer profile"
  ON volunteer_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Admins can view all volunteer profiles
DROP POLICY IF EXISTS "Admins can view all volunteer profiles" ON volunteer_profiles;
CREATE POLICY "Admins can view all volunteer profiles"
  ON volunteer_profiles
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));

-- Charities can view volunteer profiles of applicants
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
-- VOLUNTEER_HOURS TABLE
-- =========================================

-- Users can create own volunteer hours
DROP POLICY IF EXISTS "Users can create own volunteer hours" ON volunteer_hours;
CREATE POLICY "Users can create own volunteer hours"
  ON volunteer_hours
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can read own volunteer hours
DROP POLICY IF EXISTS "Users can read own volunteer hours" ON volunteer_hours;
CREATE POLICY "Users can read own volunteer hours"
  ON volunteer_hours
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Charities can approve volunteer hours
DROP POLICY IF EXISTS "Charities can approve volunteer hours" ON volunteer_hours;
CREATE POLICY "Charities can approve volunteer hours"
  ON volunteer_hours
  FOR UPDATE
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ))
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- =========================================
-- VOLUNTEER_OPPORTUNITIES TABLE
-- =========================================

-- Charities can manage own opportunities
DROP POLICY IF EXISTS "Charities can manage own opportunities" ON volunteer_opportunities;
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
-- VOLUNTEER_APPLICATIONS TABLE
-- =========================================

-- Users can view own applications
DROP POLICY IF EXISTS "Users can view own applications" ON volunteer_applications;
CREATE POLICY "Users can view own applications"
  ON volunteer_applications
  FOR SELECT
  TO authenticated
  USING (applicant_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())
  ));

-- Users can create applications
DROP POLICY IF EXISTS "Users can create applications" ON volunteer_applications;
CREATE POLICY "Users can create applications"
  ON volunteer_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (applicant_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())
  ));

-- Charities can view applications for their opportunities
DROP POLICY IF EXISTS "Charities can view applications for their opportunities" ON volunteer_applications;
CREATE POLICY "Charities can view applications for their opportunities"
  ON volunteer_applications
  FOR SELECT
  TO authenticated
  USING (opportunity_id IN (
    SELECT id FROM volunteer_opportunities
    WHERE charity_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  ));

-- Charities can update applications
DROP POLICY IF EXISTS "Charities can update applications" ON volunteer_applications;
CREATE POLICY "Charities can update applications"
  ON volunteer_applications
  FOR UPDATE
  TO authenticated
  USING (opportunity_id IN (
    SELECT id FROM volunteer_opportunities
    WHERE charity_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  ))
  WITH CHECK (opportunity_id IN (
    SELECT id FROM volunteer_opportunities
    WHERE charity_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  ));

-- =========================================
-- VOLUNTEER_VERIFICATIONS TABLE
-- =========================================

-- Charities can create verifications
DROP POLICY IF EXISTS "Charities can create verifications" ON volunteer_verifications;
CREATE POLICY "Charities can create verifications"
  ON volunteer_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- Charities can update own verifications
DROP POLICY IF EXISTS "Charities can update own verifications" ON volunteer_verifications;
CREATE POLICY "Charities can update own verifications"
  ON volunteer_verifications
  FOR UPDATE
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ))
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- =========================================
-- REMAINING TABLES (simplified patterns)
-- =========================================

-- PROFILE_UPDATE_APPROVALS
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

-- CHARITY_DOCUMENTS
DROP POLICY IF EXISTS "Charities can upload own documents" ON charity_documents;
CREATE POLICY "Charities can upload own documents"
  ON charity_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

DROP POLICY IF EXISTS "Charities can read own documents" ON charity_documents;
CREATE POLICY "Charities can read own documents"
  ON charity_documents
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- RATE_LIMITS
DROP POLICY IF EXISTS "Admins can view rate limits" ON rate_limits;
CREATE POLICY "Admins can view rate limits"
  ON rate_limits
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Anyone can view their own audit logs" ON audit_logs;
CREATE POLICY "Anyone can view their own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- WAITLIST
DROP POLICY IF EXISTS "Admins can read waitlist data" ON waitlist;
CREATE POLICY "Admins can read waitlist data"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));

-- USER_SKILLS
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

-- WALLET_ALIASES
DROP POLICY IF EXISTS "Users can manage their own wallet aliases" ON wallet_aliases;
CREATE POLICY "Users can manage their own wallet aliases"
  ON wallet_aliases
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- DONOR_PROFILES
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

-- USER_PREFERENCES
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- IMPACT_METRICS
DROP POLICY IF EXISTS "Charities can create own impact metrics" ON impact_metrics;
CREATE POLICY "Charities can create own impact metrics"
  ON impact_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- SKILL_ENDORSEMENTS
DROP POLICY IF EXISTS "Users can create endorsements" ON skill_endorsements;
CREATE POLICY "Users can create endorsements"
  ON skill_endorsements
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = endorsed_by);

-- CHARITY_DETAILS
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

-- CHARITY_APPROVALS
DROP POLICY IF EXISTS "Admins can view all charity approvals" ON charity_approvals;
CREATE POLICY "Admins can view all charity approvals"
  ON charity_approvals
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can update charity approvals" ON charity_approvals;
CREATE POLICY "Admins can update charity approvals"
  ON charity_approvals
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));

DROP POLICY IF EXISTS "Charities can view their own approvals" ON charity_approvals;
CREATE POLICY "Charities can view their own approvals"
  ON charity_approvals
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

DROP POLICY IF EXISTS "Charities can create approval requests" ON charity_approvals;
CREATE POLICY "Charities can create approval requests"
  ON charity_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));