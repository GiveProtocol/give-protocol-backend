-- Remove duplicate indexes to improve write performance
-- This fixes 7 duplicate index issues identified by Supabase linter

-- charity_documents table - keep charity_documents_charity_id_idx, drop idx_charity_documents_charity_id
DROP INDEX IF EXISTS idx_charity_documents_charity_id;

-- donor_profiles table - keep donor_profiles_profile_id_idx, drop idx_donor_profiles_profile_id
DROP INDEX IF EXISTS idx_donor_profiles_profile_id;

-- impact_metrics table - keep impact_metrics_charity_id_idx, drop idx_impact_metrics_charity_id
DROP INDEX IF EXISTS idx_impact_metrics_charity_id;

-- profiles table - keep profiles_user_id_key, drop unique_user_profile
DROP INDEX IF EXISTS unique_user_profile;

-- volunteer_applications table - keep volunteer_applications_applicant_id_idx, drop idx_volunteer_applications_applicant_id
DROP INDEX IF EXISTS idx_volunteer_applications_applicant_id;

-- volunteer_applications table - keep volunteer_applications_opportunity_id_idx, drop idx_volunteer_applications_opportunity_id
DROP INDEX IF EXISTS idx_volunteer_applications_opportunity_id;

-- volunteer_opportunities table - keep volunteer_opportunities_charity_id_idx, drop idx_volunteer_opportunities_charity_id
DROP INDEX IF EXISTS idx_volunteer_opportunities_charity_id;

