/*
  # Add Volunteer Skills and Hours Tracking

  1. New Tables
    - `skills` - Predefined skills that can be endorsed
    - `user_skills` - Skills possessed by users
    - `skill_endorsements` - Tracks skill endorsements between users
    - `volunteer_hours` - Tracks volunteer hours
    - `user_preferences` - User settings and preferences
    - `donation_impacts` - Tracks donation impact metrics

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
    - Add constraints and validations
*/

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level text CHECK (proficiency_level IN ('beginner', 'intermediate', 'expert')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Create skill_endorsements table
CREATE TABLE IF NOT EXISTS skill_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_users CHECK (endorser_id != recipient_id),
  UNIQUE(endorser_id, recipient_id, skill_id)
);

-- Create volunteer_hours table
CREATE TABLE IF NOT EXISTS volunteer_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  charity_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  hours numeric NOT NULL CHECK (hours > 0),
  description text,
  date_performed date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id)
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  privacy_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create donation_impacts table
CREATE TABLE IF NOT EXISTS donation_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid REFERENCES donations(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  impact_description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_impacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Skills policies
CREATE POLICY "Anyone can read skills"
  ON skills FOR SELECT
  TO authenticated
  USING (true);

-- User skills policies
CREATE POLICY "Users can read own skills"
  ON user_skills FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own skills"
  ON user_skills FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Skill endorsements policies
CREATE POLICY "Anyone can read endorsements"
  ON skill_endorsements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create endorsements"
  ON skill_endorsements FOR INSERT
  TO authenticated
  WITH CHECK (endorser_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Volunteer hours policies
CREATE POLICY "Users can read own volunteer hours"
  ON volunteer_hours FOR SELECT
  TO authenticated
  USING (
    volunteer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    charity_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create own volunteer hours"
  ON volunteer_hours FOR INSERT
  TO authenticated
  WITH CHECK (volunteer_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Charities can approve volunteer hours"
  ON volunteer_hours FOR UPDATE
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (status IN ('approved', 'rejected'));

-- User preferences policies
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Donation impacts policies
CREATE POLICY "Anyone can read donation impacts"
  ON donation_impacts FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes for performance
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill_id);
CREATE INDEX idx_skill_endorsements_recipient ON skill_endorsements(recipient_id);
CREATE INDEX idx_volunteer_hours_volunteer ON volunteer_hours(volunteer_id);
CREATE INDEX idx_volunteer_hours_charity ON volunteer_hours(charity_id);
CREATE INDEX idx_volunteer_hours_date ON volunteer_hours(date_performed);
CREATE INDEX idx_donation_impacts_donation ON donation_impacts(donation_id);

-- Insert default skills
INSERT INTO skills (name, category, description) VALUES
  ('Web Development', 'Technology', 'Building and maintaining websites'),
  ('Project Management', 'Leadership', 'Managing projects and teams'),
  ('Event Planning', 'Organization', 'Planning and coordinating events'),
  ('Fundraising', 'Development', 'Raising funds for charitable causes'),
  ('Teaching', 'Education', 'Educational instruction and training'),
  ('Marketing', 'Communication', 'Promoting organizations and causes'),
  ('Data Analysis', 'Technology', 'Analyzing and interpreting data'),
  ('Community Building', 'Leadership', 'Building and engaging communities'),
  ('Social Media', 'Communication', 'Managing social media presence'),
  ('Research', 'Analysis', 'Conducting research and analysis')
ON CONFLICT (name) DO UPDATE 
SET 
  category = EXCLUDED.category,
  description = EXCLUDED.description;

-- Add trigger for updating user_preferences.updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add function to calculate total volunteer hours
CREATE OR REPLACE FUNCTION get_total_volunteer_hours(user_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(hours)
     FROM volunteer_hours
     WHERE volunteer_id = user_id
     AND status = 'approved'),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get user endorsements count
CREATE OR REPLACE FUNCTION get_user_endorsements_count(user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN COALESCE(
    (SELECT COUNT(*)
     FROM skill_endorsements
     WHERE recipient_id = user_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;