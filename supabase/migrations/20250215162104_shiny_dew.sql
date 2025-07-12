/*
  # Database Optimizations and Fixes

  1. Indexes
    - Add performance-optimizing indexes
    - Add composite indexes for common queries
    - Add indexes for foreign key columns
  
  2. Constraints
    - Add check constraints for numeric values
    - Add balance validation via triggers
  
  3. Triggers
    - Add balance update triggers
    - Add withdrawal validation
*/

-- Start transaction
BEGIN;

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_donations_amount ON donations(amount);
CREATE INDEX IF NOT EXISTS idx_donations_created_at_amount ON donations(created_at DESC, amount);

CREATE INDEX IF NOT EXISTS idx_charity_details_category ON charity_details(category);
CREATE INDEX IF NOT EXISTS idx_charity_details_total_received ON charity_details(total_received DESC);

-- Add partial indexes for common filtered queries
CREATE INDEX IF NOT EXISTS idx_active_withdrawals
  ON withdrawal_requests(charity_id)
  WHERE status = 'pending';

-- Add GiST index for timestamp range queries
CREATE INDEX IF NOT EXISTS idx_impact_metrics_timerange
  ON impact_metrics
  USING GIST (time_period);

-- Add check constraints for positive amounts
ALTER TABLE charity_details
  ADD CONSTRAINT check_total_received_positive 
    CHECK (total_received >= 0),
  ADD CONSTRAINT check_available_balance_positive 
    CHECK (available_balance >= 0),
  ADD CONSTRAINT check_available_balance_total 
    CHECK (available_balance <= total_received);

ALTER TABLE withdrawal_requests
  ADD CONSTRAINT check_withdrawal_amount_positive
    CHECK (amount > 0);

-- Create function to update charity balances
CREATE OR REPLACE FUNCTION update_charity_balances()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE charity_details
    SET 
      total_received = total_received + NEW.amount,
      available_balance = available_balance + NEW.amount
    WHERE profile_id = NEW.charity_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE charity_details
    SET 
      total_received = total_received - OLD.amount,
      available_balance = available_balance - OLD.amount
    WHERE profile_id = OLD.charity_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for donation balance updates
DROP TRIGGER IF EXISTS trg_update_charity_balances ON donations;
CREATE TRIGGER trg_update_charity_balances
  AFTER INSERT OR DELETE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_charity_balances();

-- Create function to validate withdrawal amounts
CREATE OR REPLACE FUNCTION validate_withdrawal_amount()
RETURNS TRIGGER AS $$
DECLARE
  available NUMERIC;
BEGIN
  SELECT available_balance INTO available
  FROM charity_details 
  WHERE profile_id = NEW.charity_id;

  IF NEW.amount > available THEN
    RAISE EXCEPTION 'Withdrawal amount (%) exceeds available balance (%)', NEW.amount, available;
  END IF;
  
  -- Update available balance
  UPDATE charity_details
  SET available_balance = available_balance - NEW.amount
  WHERE profile_id = NEW.charity_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for withdrawal validation
DROP TRIGGER IF EXISTS trg_validate_withdrawal ON withdrawal_requests;
CREATE TRIGGER trg_validate_withdrawal
  BEFORE INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_withdrawal_amount();

-- Add statistics gathering
ANALYZE profiles;
ANALYZE donations;
ANALYZE charity_details;
ANALYZE withdrawal_requests;
ANALYZE impact_metrics;

COMMIT;