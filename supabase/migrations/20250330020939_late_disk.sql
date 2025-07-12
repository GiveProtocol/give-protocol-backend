/*
  # Add Volunteer Management Tables

  1. New Tables
    - `volunteer_opportunities` - For posting volunteer opportunities
    - `volunteer_applications` - For tracking volunteer applications

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
    - Add constraints and validations
*/

-- Create volunteer opportunities table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS volunteer_opportunities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    charity_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    skills text[] NOT NULL,
    commitment text NOT NULL CHECK (commitment IN ('one-time', 'short-term', 'long-term')),
    location text NOT NULL,
    type text NOT NULL CHECK (type IN ('onsite', 'remote', 'hybrid')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Create volunteer applications table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS volunteer_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id uuid REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
    applicant_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    phone_number text NOT NULL,
    email text NOT NULL,
    date_of_birth date,
    availability jsonb NOT NULL,
    commitment_type text NOT NULL CHECK (commitment_type IN ('one-time', 'short-term', 'long-term')),
    experience text,
    skills text[],
    certifications text[],
    interests text[],
    reference_contacts jsonb,
    work_samples text[],
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Add indexes for performance if they don't exist
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS volunteer_opportunities_charity_id_idx ON volunteer_opportunities(charity_id);
  CREATE INDEX IF NOT EXISTS volunteer_opportunities_status_idx ON volunteer_opportunities(status);
  CREATE INDEX IF NOT EXISTS volunteer_opportunities_created_at_idx ON volunteer_opportunities(created_at DESC);

  CREATE INDEX IF NOT EXISTS volunteer_applications_applicant_id_idx ON volunteer_applications(applicant_id);
  CREATE INDEX IF NOT EXISTS volunteer_applications_opportunity_id_idx ON volunteer_applications(opportunity_id);
  CREATE INDEX IF NOT EXISTS volunteer_applications_status_idx ON volunteer_applications(status);
  CREATE INDEX IF NOT EXISTS volunteer_applications_created_at_idx ON volunteer_applications(created_at DESC);
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Enable RLS
ALTER TABLE volunteer_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active opportunities" ON volunteer_opportunities;
DROP POLICY IF EXISTS "Charities can manage own opportunities" ON volunteer_opportunities;
DROP POLICY IF EXISTS "Users can view own applications" ON volunteer_applications;
DROP POLICY IF EXISTS "Charities can view applications for their opportunities" ON volunteer_applications;
DROP POLICY IF EXISTS "Users can create applications" ON volunteer_applications;
DROP POLICY IF EXISTS "Charities can update applications" ON volunteer_applications;

-- Create new policies
CREATE POLICY "Anyone can read active opportunities"
  ON volunteer_opportunities FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Charities can manage own opportunities"
  ON volunteer_opportunities FOR ALL
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND type = 'charity'
  ))
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND type = 'charity'
  ));

CREATE POLICY "Users can view own applications"
  ON volunteer_applications FOR SELECT
  TO authenticated
  USING (applicant_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Charities can view applications for their opportunities"
  ON volunteer_applications FOR SELECT
  TO authenticated
  USING (opportunity_id IN (
    SELECT id FROM volunteer_opportunities WHERE charity_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND type = 'charity'
    )
  ));

CREATE POLICY "Users can create applications"
  ON volunteer_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = applicant_id
  ));

CREATE POLICY "Charities can update applications"
  ON volunteer_applications FOR UPDATE
  TO authenticated
  USING (opportunity_id IN (
    SELECT id FROM volunteer_opportunities WHERE charity_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND type = 'charity'
    )
  ));

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$ BEGIN
  CREATE TRIGGER update_volunteer_opportunities_updated_at
    BEFORE UPDATE ON volunteer_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_volunteer_applications_updated_at
    BEFORE UPDATE ON volunteer_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;