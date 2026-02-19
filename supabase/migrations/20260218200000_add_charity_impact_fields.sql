-- Add impact profile columns to charity_details
ALTER TABLE charity_details
  ADD COLUMN IF NOT EXISTS mission_statement text,
  ADD COLUMN IF NOT EXISTS impact_stats jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS impact_highlights text[] DEFAULT '{}'::text[];
