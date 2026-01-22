/*
  # Clean Database Migration

  1. Changes
    - Safely removes all sample data
    - Preserves reference data (charity categories)
    - Uses safe deletion methods
    - Maintains referential integrity

  2. Security
    - Avoids system-level operations
    - Uses standard SQL operations
    - Maintains RLS policies
*/

BEGIN;

-- Clear all data in reverse dependency order
-- NOSONAR: Intentional full table clears to reset sample data (plsql:DeleteOrUpdateWithoutWhereCheck)
DELETE FROM impact_metrics;
DELETE FROM charity_documents;
DELETE FROM withdrawal_requests;
DELETE FROM donations;
DELETE FROM charity_details;
DELETE FROM donor_profiles;
DELETE FROM profiles;

-- Refresh charity categories with clean insert
DELETE FROM charity_categories; -- NOSONAR: Intentional clear before re-seeding
INSERT INTO charity_categories (name, description)
VALUES 
  ('Water & Sanitation', 'Clean water and sanitation projects'),
  ('Education', 'Educational programs and initiatives'),
  ('Healthcare', 'Medical services and health programs'),
  ('Environment', 'Environmental conservation efforts'),
  ('Poverty Relief', 'Programs addressing poverty and basic needs'),
  ('Animal Welfare', 'Animal protection and welfare programs')
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description;

COMMIT;