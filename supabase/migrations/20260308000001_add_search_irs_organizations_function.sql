-- Full-text search function for IRS organizations
-- Uses websearch_to_tsquery for 3+ char queries, ILIKE fallback for shorter ones
-- Results sorted by is_on_platform DESC then relevance rank DESC

CREATE OR REPLACE FUNCTION search_irs_organizations(
  search_query TEXT,
  filter_state TEXT DEFAULT NULL,
  filter_ntee TEXT DEFAULT NULL,
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  ein TEXT,
  name TEXT,
  city TEXT,
  state CHARACTER(2),
  zip TEXT,
  ntee_cd TEXT,
  deductibility TEXT,
  is_on_platform BOOLEAN,
  platform_charity_id UUID,
  rank REAL
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  ts_query TSQUERY;
BEGIN
  IF length(trim(search_query)) >= 3 THEN
    ts_query := websearch_to_tsquery('english', search_query);

    RETURN QUERY
    SELECT
      o.ein,
      o.name,
      o.city,
      o.state,
      o.zip,
      o.ntee_cd,
      o.deductibility,
      o.is_on_platform,
      o.platform_charity_id,
      ts_rank(o.search_vector, ts_query)::REAL AS rank
    FROM irs_organizations o
    WHERE o.search_vector @@ ts_query
      AND (filter_state IS NULL OR o.state = filter_state)
      AND (filter_ntee IS NULL OR o.ntee_cd = filter_ntee)
    ORDER BY o.is_on_platform DESC, rank DESC
    LIMIT result_limit
    OFFSET result_offset;
  ELSE
    RETURN QUERY
    SELECT
      o.ein,
      o.name,
      o.city,
      o.state,
      o.zip,
      o.ntee_cd,
      o.deductibility,
      o.is_on_platform,
      o.platform_charity_id,
      1.0::REAL AS rank
    FROM irs_organizations o
    WHERE o.name ILIKE '%' || trim(search_query) || '%'
      AND (filter_state IS NULL OR o.state = filter_state)
      AND (filter_ntee IS NULL OR o.ntee_cd = filter_ntee)
    ORDER BY o.is_on_platform DESC, o.name
    LIMIT result_limit
    OFFSET result_offset;
  END IF;
END;
$$;
