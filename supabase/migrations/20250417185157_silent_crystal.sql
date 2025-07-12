/*
  # Add Wallet Alias Feature

  1. New Tables
    - `wallet_aliases`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `wallet_address` (text)
      - `alias` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `wallet_aliases` table
    - Add policies for users to manage their own wallet aliases
    - Add policy for public to read wallet aliases
*/

-- Create wallet_aliases table
CREATE TABLE IF NOT EXISTS wallet_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  wallet_address text NOT NULL,
  alias text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, wallet_address),
  UNIQUE(alias)
);

-- Create updated_at trigger
CREATE TRIGGER update_wallet_aliases_updated_at
  BEFORE UPDATE ON wallet_aliases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE wallet_aliases ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can manage their own wallet aliases"
  ON wallet_aliases
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read wallet aliases"
  ON wallet_aliases
  FOR SELECT
  TO public
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_wallet_aliases_user_id ON wallet_aliases(user_id);
CREATE INDEX idx_wallet_aliases_wallet_address ON wallet_aliases(wallet_address);
CREATE INDEX idx_wallet_aliases_alias ON wallet_aliases(alias);

-- Add function to get alias for wallet address
CREATE OR REPLACE FUNCTION get_wallet_alias(address text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  alias_name text;
BEGIN
  SELECT alias INTO alias_name
  FROM wallet_aliases
  WHERE wallet_address = address
  LIMIT 1;

  RETURN alias_name;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_wallet_alias TO authenticated;