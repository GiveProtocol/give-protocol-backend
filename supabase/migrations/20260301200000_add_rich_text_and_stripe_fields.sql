-- Rich text fields for charity profile sections
ALTER TABLE charity_details ADD COLUMN IF NOT EXISTS story_heading text DEFAULT '';
ALTER TABLE charity_details ADD COLUMN IF NOT EXISTS story_body text DEFAULT '';
ALTER TABLE charity_details ADD COLUMN IF NOT EXISTS mission_heading text DEFAULT '';
ALTER TABLE charity_details ADD COLUMN IF NOT EXISTS mission_body text DEFAULT '';
ALTER TABLE charity_details ADD COLUMN IF NOT EXISTS impact_heading text DEFAULT '';
ALTER TABLE charity_details ADD COLUMN IF NOT EXISTS impact_body text DEFAULT '';

-- Stripe integration fields
ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS provider text DEFAULT 'helcim';
ALTER TABLE fiat_donations ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE fiat_donations ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE fiat_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE fiat_subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id text;
