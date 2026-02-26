-- Add attestation tracking for fiat donations on-chain via FiatDonationAttestation contract.
-- Also adds missing donor_address column to fiat_donations and fiat_subscriptions
-- (already inserted by helcim-validate edge function).

-- ---------------------------------------------------------------------------
-- 1a. Add donor_address to fix helcim-validate bug
-- ---------------------------------------------------------------------------
ALTER TABLE fiat_donations ADD COLUMN IF NOT EXISTS donor_address text;
ALTER TABLE fiat_subscriptions ADD COLUMN IF NOT EXISTS donor_address text;

-- ---------------------------------------------------------------------------
-- 1b. Attestation tracking columns on fiat_donations
-- ---------------------------------------------------------------------------
ALTER TABLE fiat_donations
  ADD COLUMN IF NOT EXISTS attestation_hash text,
  ADD COLUMN IF NOT EXISTS attestation_tx_hash text,
  ADD COLUMN IF NOT EXISTS attestation_chain text,
  ADD COLUMN IF NOT EXISTS attestation_status text NOT NULL DEFAULT 'pending'
    CHECK (attestation_status IN ('pending', 'submitted', 'confirmed', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS attestation_error text,
  ADD COLUMN IF NOT EXISTS attestation_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attested_at timestamptz;

-- ---------------------------------------------------------------------------
-- 1c. charity_blockchain_addresses table
-- ---------------------------------------------------------------------------
CREATE TABLE charity_blockchain_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id uuid REFERENCES profiles NOT NULL,
  chain text NOT NULL,
  address text NOT NULL,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(charity_id, chain)
);

CREATE INDEX idx_charity_blockchain_addresses_charity
  ON charity_blockchain_addresses (charity_id);

-- RLS: public read (wallet addresses are public on-chain), service-role write
ALTER TABLE charity_blockchain_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_charity_blockchain_addresses"
  ON charity_blockchain_addresses
  FOR SELECT USING (true);

CREATE POLICY "service_role_manage_charity_blockchain_addresses"
  ON charity_blockchain_addresses
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ---------------------------------------------------------------------------
-- 1d. Indexes for attestation processing
-- ---------------------------------------------------------------------------

-- Pending attestations on completed donations (cron sweep picks these up)
CREATE INDEX idx_fiat_donations_attestation_pending
  ON fiat_donations (created_at)
  WHERE attestation_status = 'pending' AND status = 'completed';

-- Failed attestations eligible for retry
CREATE INDEX idx_fiat_donations_attestation_retry
  ON fiat_donations (created_at)
  WHERE attestation_status = 'failed' AND attestation_attempts < 5;

-- Lookup by attestation hash
CREATE INDEX idx_fiat_donations_attestation_hash
  ON fiat_donations (attestation_hash)
  WHERE attestation_hash IS NOT NULL;

COMMENT ON TABLE charity_blockchain_addresses IS
  'Mapping of charity profiles to their blockchain wallet addresses, keyed by chain.';
COMMENT ON COLUMN fiat_donations.attestation_status IS
  'On-chain attestation lifecycle: pending → submitted → confirmed / failed / skipped.';
