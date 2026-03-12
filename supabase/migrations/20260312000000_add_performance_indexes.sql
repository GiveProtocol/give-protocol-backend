-- Performance indexes for frequently queried columns that lack coverage

-- validation_requests: queried by (organization_id, status) in getOrganizationValidationQueue
CREATE INDEX IF NOT EXISTS idx_validation_requests_org_status
  ON validation_requests (organization_id, status);

-- volunteer_hours: queried by (volunteer_id, status) in leaderboard and contribution stats
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_volunteer_status
  ON volunteer_hours (volunteer_id, status);

-- fiat_donations: queried by status in attestation flow
CREATE INDEX IF NOT EXISTS idx_fiat_donations_status
  ON fiat_donations (status);

-- skill_endorsements: queried by recipient_id in contribution stats
CREATE INDEX IF NOT EXISTS idx_skill_endorsements_recipient
  ON skill_endorsements (recipient_id);
