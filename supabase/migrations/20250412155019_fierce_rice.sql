/*
  # Add Volunteer Verification Schema

  1. New Tables
    - `volunteer_verifications`
      - Stores verification hashes for volunteer activities
      - Links applications and hours to blockchain records
  
  2. Changes
    - Add acceptance_hash to volunteer_applications
    - Add verification_hash to volunteer_hours
    - Add blockchain_reference to volunteer_verifications
  
  3. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Add acceptance_hash to volunteer_applications if it doesn't exist
ALTER TABLE volunteer_applications 
ADD COLUMN IF NOT EXISTS acceptance_hash text;

-- Add verification_hash to volunteer_hours if it doesn't exist
ALTER TABLE volunteer_hours 
ADD COLUMN IF NOT EXISTS verification_hash text;

-- Create volunteer_verifications table
CREATE TABLE IF NOT EXISTS volunteer_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
  charity_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  acceptance_hash text,
  verification_hash text,
  accepted_at timestamptz,
  verified_at timestamptz,
  blockchain_reference jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_volunteer_verifications_applicant 
  ON volunteer_verifications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_verifications_charity 
  ON volunteer_verifications(charity_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_verifications_acceptance 
  ON volunteer_verifications(acceptance_hash);
CREATE INDEX IF NOT EXISTS idx_volunteer_verifications_verification 
  ON volunteer_verifications(verification_hash);

-- Enable RLS
ALTER TABLE volunteer_verifications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Anyone can read volunteer verifications"
  ON volunteer_verifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Charities can create verifications"
  ON volunteer_verifications FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Charities can update own verifications"
  ON volunteer_verifications FOR UPDATE
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Create function to verify volunteer hash
CREATE OR REPLACE FUNCTION verify_volunteer_hash(hash_to_verify text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT json_build_object(
    'exists', true,
    'verification', row_to_json(v),
    'applicant', row_to_json(a),
    'opportunity', row_to_json(o),
    'charity', row_to_json(c)
  )::jsonb INTO result
  FROM volunteer_verifications v
  LEFT JOIN profiles a ON v.applicant_id = a.id
  LEFT JOIN volunteer_opportunities o ON v.opportunity_id = o.id
  LEFT JOIN profiles c ON v.charity_id = c.id
  WHERE v.acceptance_hash = hash_to_verify OR v.verification_hash = hash_to_verify
  LIMIT 1;

  IF result IS NULL THEN
    RETURN json_build_object('exists', false)::jsonb;
  END IF;

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'exists', false,
    'error', SQLERRM
  )::jsonb;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_volunteer_hash TO authenticated;