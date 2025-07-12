/*
  # Database Optimizations and Constraints

  1. Changes
    - Add cascading deletes for related tables
    - Add missing indexes
    - Add numeric constraints
    - Add missing timestamps
    - Add data validation checks
  
  2. Security
    - Maintains existing RLS policies
    - Adds additional data validation
*/

BEGIN;

-- Add cascading deletes for related tables
ALTER TABLE charity_details
  DROP CONSTRAINT IF EXISTS charity_details_profile_id_fkey,
  ADD CONSTRAINT charity_details_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;

ALTER TABLE donor_profiles
  DROP CONSTRAINT IF EXISTS donor_profiles_profile_id_fkey,
  ADD CONSTRAINT donor_profiles_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;

ALTER TABLE charity_documents
  DROP CONSTRAINT IF EXISTS charity_documents_charity_id_fkey,
  ADD CONSTRAINT charity_documents_charity_id_fkey
    FOREIGN KEY (charity_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;

-- Add numeric constraints
ALTER TABLE donations
  ADD CONSTRAINT donations_amount_positive CHECK (amount > 0),
  ALTER COLUMN amount SET DEFAULT 0;

ALTER TABLE charity_details
  ADD CONSTRAINT charity_details_total_received_positive CHECK (total_received >= 0),
  ADD CONSTRAINT charity_details_available_balance_positive CHECK (available_balance >= 0);

ALTER TABLE donor_profiles
  ADD CONSTRAINT donor_profiles_total_donated_positive CHECK (total_donated >= 0);

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_donor_charity ON donations(donor_id, charity_id);
CREATE INDEX IF NOT EXISTS idx_charity_details_category ON charity_details(category);
CREATE INDEX IF NOT EXISTS idx_charity_documents_type ON charity_documents(document_type);

-- Add updated_at columns where missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charity_details' AND column_name = 'updated_at') 
  THEN
    ALTER TABLE charity_details ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'donor_profiles' AND column_name = 'updated_at') 
  THEN
    ALTER TABLE donor_profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add triggers to automatically update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_charity_details_updated_at') THEN
    CREATE TRIGGER update_charity_details_updated_at
      BEFORE UPDATE ON charity_details
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_donor_profiles_updated_at') THEN
    CREATE TRIGGER update_donor_profiles_updated_at
      BEFORE UPDATE ON donor_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;