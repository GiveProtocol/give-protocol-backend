-- Checkout sessions table for HelcimPay.js hash validation
-- Stores the secretToken server-side so it never reaches the frontend.
-- The helcim-validate edge function looks up the secretToken by checkoutToken
-- to verify the SHA-256 hash of the transaction response from Helcim.

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_token text NOT NULL UNIQUE,
  secret_token text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  donation_type text NOT NULL CHECK (donation_type IN ('one-time', 'subscription')),
  validated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

-- Fast lookup by token for validation requests
CREATE INDEX idx_checkout_sessions_pending
  ON checkout_sessions (checkout_token)
  WHERE NOT validated;

-- Periodic cleanup of expired sessions (run via pg_cron or manual)
CREATE INDEX idx_checkout_sessions_expired
  ON checkout_sessions (expires_at)
  WHERE NOT validated;

-- RLS: no user-facing policies — only the service role key can access
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE checkout_sessions IS
  'Short-lived sessions linking HelcimPay.js checkoutTokens to their secretTokens for server-side hash validation.';
