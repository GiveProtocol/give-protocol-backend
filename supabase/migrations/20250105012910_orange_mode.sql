/*
  # Add withdrawal requests functionality

  1. New Tables
    - `withdrawal_requests`
      - `id` (uuid, primary key)
      - `charity_id` (uuid, references profiles)
      - `amount` (numeric)
      - `status` (text: pending, approved, rejected)
      - `created_at` (timestamptz)
      - `processed_at` (timestamptz)

  2. Security
    - Enable RLS on `withdrawal_requests` table
    - Add policies for charities to manage their withdrawal requests
    - Add trigger to ensure only charity profiles can request withdrawals
*/

-- Create withdrawal requests table
CREATE TABLE withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id uuid REFERENCES profiles NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Create trigger function to check if profile is a charity
CREATE OR REPLACE FUNCTION check_charity_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.charity_id AND type = 'charity'
  ) THEN
    RAISE EXCEPTION 'Only charity profiles can request withdrawals';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER ensure_charity_profile
  BEFORE INSERT OR UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_charity_profile();

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Charities can read their own withdrawal requests
CREATE POLICY "Charities can view own withdrawals"
  ON withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND type = 'charity'
  ));

-- Charities can create withdrawal requests
CREATE POLICY "Charities can create withdrawals"
  ON withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND type = 'charity'
  ));