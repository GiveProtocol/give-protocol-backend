-- IRS nonprofit organizations table for charity search/discovery
-- Data sourced from IRS Exempt Organizations Business Master File (BMF)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS irs_organizations (
  ein                 TEXT         NOT NULL PRIMARY KEY,
  name                TEXT         NOT NULL,
  ico                 TEXT,
  street              TEXT,
  city                TEXT,
  state               CHARACTER(2),
  zip                 TEXT,
  group_exemption     TEXT,
  subsection          TEXT,
  affiliation         TEXT,
  classification      TEXT,
  ruling              TEXT,
  deductibility       TEXT,
  foundation          TEXT,
  activity            TEXT,
  organization        TEXT,
  status              TEXT,
  ntee_cd             TEXT,
  sort_name           TEXT,
  is_on_platform      BOOLEAN      DEFAULT false,
  platform_charity_id UUID,
  search_vector       TSVECTOR     GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(state, '')::text), 'C') ||
    setweight(to_tsvector('english', coalesce(ntee_cd, '')), 'D')
  ) STORED
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_irs_orgs_search_vector ON irs_organizations USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_irs_orgs_name_trgm ON irs_organizations USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_irs_orgs_state ON irs_organizations(state);
CREATE INDEX IF NOT EXISTS idx_irs_orgs_ntee_cd ON irs_organizations(ntee_cd);
CREATE INDEX IF NOT EXISTS idx_irs_orgs_is_on_platform ON irs_organizations(is_on_platform);

-- RLS: public read, service_role full access
ALTER TABLE irs_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON irs_organizations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service_role full access"
  ON irs_organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
