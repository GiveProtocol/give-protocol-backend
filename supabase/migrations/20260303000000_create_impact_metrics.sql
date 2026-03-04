-- Impact metrics table for the Impact Calculator feature.
-- Each row defines one metric for a portfolio fund (e.g. "$25 = 1 acre of rainforest").
-- The frontend divides the donor's chosen amount by unit_cost_usd to show estimated outcomes.

CREATE TABLE impact_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  unit_cost_usd DECIMAL(12,4) NOT NULL CHECK (unit_cost_usd > 0),
  unit_icon TEXT NOT NULL DEFAULT 'heart',
  description_template TEXT NOT NULL DEFAULT 'This could provide {{value}} {{unit_name}}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE impact_metrics IS
  'Per-fund multipliers used by the Impact Calculator on portfolio detail pages.';

CREATE INDEX idx_impact_metrics_fund_id ON impact_metrics(fund_id);

CREATE TRIGGER trigger_impact_metrics_updated_at
  BEFORE UPDATE ON impact_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE impact_metrics ENABLE ROW LEVEL SECURITY;

-- Public read access so any visitor can see the calculator
CREATE POLICY "Anyone can view impact metrics" ON impact_metrics
  FOR SELECT TO public USING (true);

-- Only admins may insert, update, or delete
CREATE POLICY "Admins can manage impact metrics" ON impact_metrics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = (SELECT auth.uid())
        AND profiles.type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = (SELECT auth.uid())
        AND profiles.type = 'admin'
    )
  );
