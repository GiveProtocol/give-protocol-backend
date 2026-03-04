-- Seed data for the three existing portfolio funds.
-- Fund '1' = Environmental, Fund '2' = Poverty Relief, Fund '3' = Education.

INSERT INTO impact_metrics (fund_id, unit_name, unit_cost_usd, unit_icon, description_template, sort_order) VALUES
  -- Environmental Impact Fund
  ('1', 'Acres of Rainforest Protected',  25.0000, 'trees',       'This could protect {{value}} {{unit_name}}',  0),
  ('1', 'Tree Saplings Planted',           5.0000, 'sprout',      'This could plant {{value}} {{unit_name}}',    1),
  ('1', 'Tons of CO₂ Offset',           100.0000, 'wind',        'This could offset {{value}} {{unit_name}}',   2),

  -- Poverty Relief Impact Fund
  ('2', 'Meal Packs Provided',            10.0000, 'utensils',    'This could provide {{value}} {{unit_name}}',  0),
  ('2', 'Medical Checkups Funded',        50.0000, 'heart-pulse', 'This could fund {{value}} {{unit_name}}',     1),
  ('2', 'Micro-Loans Enabled',          200.0000, 'hand-coins',  'This could enable {{value}} {{unit_name}}',   2),

  -- Education Impact Fund
  ('3', 'Days of School Funded',           2.5000, 'graduation-cap', 'This could fund {{value}} {{unit_name}}',  0),
  ('3', 'Textbooks Provided',            15.0000, 'book-open',      'This could provide {{value}} {{unit_name}}', 1),
  ('3', 'Scholarship Months Funded',     75.0000, 'award',          'This could fund {{value}} {{unit_name}}',    2);
