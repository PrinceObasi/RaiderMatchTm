
-- Add missing tech tags to canonical list
INSERT INTO tech_tags (tag) VALUES
  ('simulink'),
  ('power bi'),
  ('pandas'),
  ('scikit-learn'),
  ('erlang'),
  ('android'),
  ('ci/cd'),
  ('bash')
ON CONFLICT (tag) DO NOTHING;
