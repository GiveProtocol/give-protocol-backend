-- Fiat donation tracking tables for HelcimPay.js card payments
-- Separate from the crypto `donations` table to support fiat-specific fields
-- (card info, disbursement status, subscription references).

-- ---------------------------------------------------------------------------
-- fiat_subscriptions (created first for FK from fiat_donations)
-- ---------------------------------------------------------------------------
CREATE TABLE fiat_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES profiles NOT NULL,
  charity_id uuid REFERENCES profiles NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  customer_id text NOT NULL DEFAULT '',
  donor_name text NOT NULL DEFAULT '',
  donor_email text NOT NULL DEFAULT '',
  fee_covered boolean NOT NULL DEFAULT false,
  frequency text NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled')),
  next_billing_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- fiat_donations
-- ---------------------------------------------------------------------------
CREATE TABLE fiat_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES profiles NOT NULL,
  charity_id uuid REFERENCES profiles NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_method text NOT NULL DEFAULT 'card',
  transaction_id text NOT NULL DEFAULT '',
  card_last_four text NOT NULL DEFAULT '',
  card_type text NOT NULL DEFAULT '',
  fee_covered boolean NOT NULL DEFAULT false,
  donor_name text NOT NULL DEFAULT '',
  donor_email text NOT NULL DEFAULT '',
  subscription_id uuid REFERENCES fiat_subscriptions(id),
  disbursement_status text NOT NULL DEFAULT 'received'
    CHECK (disbursement_status IN ('received', 'processing', 'disbursed')),
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_fiat_donations_donor ON fiat_donations (donor_id);
CREATE INDEX idx_fiat_donations_charity ON fiat_donations (charity_id);
CREATE INDEX idx_fiat_donations_status ON fiat_donations (disbursement_status)
  WHERE disbursement_status != 'disbursed';
CREATE INDEX idx_fiat_subscriptions_donor ON fiat_subscriptions (donor_id);
CREATE INDEX idx_fiat_subscriptions_charity ON fiat_subscriptions (charity_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE fiat_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiat_subscriptions ENABLE ROW LEVEL SECURITY;

-- Donors can read their own fiat donations
CREATE POLICY "donors_read_own_fiat_donations" ON fiat_donations
  FOR SELECT USING (
    donor_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  );

-- Charities can read donations sent to them
CREATE POLICY "charities_read_fiat_donations" ON fiat_donations
  FOR SELECT USING (
    charity_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  );

-- Donors can read their own subscriptions
CREATE POLICY "donors_read_own_fiat_subscriptions" ON fiat_subscriptions
  FOR SELECT USING (
    donor_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  );

-- Charities can read subscriptions directed at them
CREATE POLICY "charities_read_fiat_subscriptions" ON fiat_subscriptions
  FOR SELECT USING (
    charity_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  );

COMMENT ON TABLE fiat_donations IS
  'Card (fiat) donations processed via HelcimPay.js. Separate from the crypto donations table.';
COMMENT ON TABLE fiat_subscriptions IS
  'Recurring fiat donation subscriptions managed through Helcim.';
