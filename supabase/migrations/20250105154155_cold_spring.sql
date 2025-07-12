/*
  # Enhanced Donor and Charity Schema

  1. New Tables
    - `donor_profiles`
      - Additional donor-specific information
      - Linked to base profiles table
    - `charity_categories`
      - Predefined categories for charities
    - `charity_documents`
      - Store verification documents for charities
    - `impact_metrics`
      - Track charity impact metrics

  2. Security
    - Enable RLS on all new tables
    - Add policies for proper access control
    
  3. Changes
    - Add indexes for performance optimization
    - Add foreign key constraints
*/

-- Create charity categories table
CREATE TABLE IF NOT EXISTS charity_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create donor profiles table
CREATE TABLE IF NOT EXISTS donor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles NOT NULL,
  preferred_categories uuid[] DEFAULT array[]::uuid[],
  donation_frequency text CHECK (donation_frequency IN ('one-time', 'monthly', 'quarterly', 'yearly')),
  total_donated numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

-- Create charity documents table
CREATE TABLE IF NOT EXISTS charity_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id uuid REFERENCES profiles NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('tax_certificate', 'registration', 'annual_report')),
  document_url text NOT NULL,
  verified boolean DEFAULT false,
  uploaded_at timestamptz DEFAULT now(),
  verified_at timestamptz
);

-- Create impact metrics table
CREATE TABLE IF NOT EXISTS impact_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id uuid REFERENCES profiles NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  time_period tstzrange NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE charity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_metrics ENABLE ROW LEVEL SECURITY;

-- Charity categories policies
CREATE POLICY "Anyone can read charity categories"
  ON charity_categories FOR SELECT
  TO authenticated
  USING (true);

-- Donor profiles policies
CREATE POLICY "Donors can read own profile"
  ON donor_profiles FOR SELECT
  TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Donors can update own profile"
  ON donor_profiles FOR UPDATE
  TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Charity documents policies
CREATE POLICY "Charities can read own documents"
  ON charity_documents FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Charities can upload own documents"
  ON charity_documents FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Impact metrics policies
CREATE POLICY "Anyone can read impact metrics"
  ON impact_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Charities can create own impact metrics"
  ON impact_metrics FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Add indexes
CREATE INDEX IF NOT EXISTS donor_profiles_profile_id_idx ON donor_profiles(profile_id);
CREATE INDEX IF NOT EXISTS charity_documents_charity_id_idx ON charity_documents(charity_id);
CREATE INDEX IF NOT EXISTS impact_metrics_charity_id_idx ON impact_metrics(charity_id);
CREATE INDEX IF NOT EXISTS impact_metrics_time_period_idx ON impact_metrics USING GIST (time_period);

-- Insert default charity categories
INSERT INTO charity_categories (name, description) VALUES
  ('Education', 'Educational initiatives and programs'),
  ('Healthcare', 'Medical services and health programs'),
  ('Environment', 'Environmental conservation and sustainability'),
  ('Poverty Relief', 'Programs addressing poverty and basic needs'),
  ('Animal Welfare', 'Animal protection and welfare programs'),
  ('Arts & Culture', 'Cultural preservation and artistic programs'),
  ('Disaster Relief', 'Emergency response and disaster recovery'),
  ('Human Rights', 'Human rights advocacy and protection')
ON CONFLICT (name) DO NOTHING;