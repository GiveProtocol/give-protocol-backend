/*
  # Initial Schema Setup

  1. New Tables
    - profiles
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - type (text, either 'donor' or 'charity')
      - created_at (timestamp)
    - donations
      - id (uuid, primary key)
      - donor_id (uuid, references profiles)
      - charity_id (uuid, references profiles)
      - amount (numeric)
      - created_at (timestamp)
    - charity_details
      - id (uuid, primary key)
      - profile_id (uuid, references profiles)
      - name (text)
      - description (text)
      - category (text)
      - image_url (text)
      - total_received (numeric)
      - available_balance (numeric)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for data access
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type text NOT NULL CHECK (type IN ('donor', 'charity')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create donations table
CREATE TABLE donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES profiles NOT NULL,
  charity_id uuid REFERENCES profiles NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz DEFAULT now()
);

-- Create charity_details table
CREATE TABLE charity_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  image_url text,
  total_received numeric DEFAULT 0,
  available_balance numeric DEFAULT 0,
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_details ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Donations policies
CREATE POLICY "Donors can read own donations"
  ON donations FOR SELECT
  TO authenticated
  USING (donor_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Charities can read received donations"
  ON donations FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Charity details policies
CREATE POLICY "Anyone can read charity details"
  ON charity_details FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Charities can update own details"
  ON charity_details FOR UPDATE
  TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));