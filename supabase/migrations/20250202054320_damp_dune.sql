/*
  # Add Charity Donations View and Relationships

  1. Changes
    - Add charity_id to donations table
    - Create secure view for charity donations
    - Add performance indexes
    - Update RLS policies

  2. Security
    - Use security definer functions
    - Proper RLS policies
    - Safe schema modifications
*/

-- Start transaction
BEGIN;

-- Add charity_id to donations table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'donations' AND column_name = 'charity_id'
  ) THEN
    ALTER TABLE donations ADD COLUMN charity_id uuid;
    ALTER TABLE donations 
      ADD CONSTRAINT donations_charity_id_fkey 
      FOREIGN KEY (charity_id) 
      REFERENCES profiles(id);
  END IF;
END $$;

-- Create secure function to get charity donations
CREATE OR REPLACE FUNCTION get_charity_donations(donor_id uuid)
RETURNS TABLE (
  id uuid,
  amount numeric,
  created_at timestamptz,
  charity_name text,
  charity_description text
) SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.amount,
    d.created_at,
    cd.name,
    cd.description
  FROM donations d
  JOIN charity_details cd ON cd.profile_id = d.charity_id
  WHERE d.donor_id = donor_id;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_donations_donor_charity'
  ) THEN
    CREATE INDEX idx_donations_donor_charity 
      ON donations(donor_id, charity_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_charity_details_profile'
  ) THEN
    CREATE INDEX idx_charity_details_profile 
      ON charity_details(profile_id);
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_charity_donations TO authenticated;
GRANT SELECT ON donations TO authenticated;
GRANT SELECT ON charity_details TO authenticated;

-- Add RLS policies for donations
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own donations"
  ON donations FOR SELECT
  USING (
    donor_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    charity_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

COMMIT;