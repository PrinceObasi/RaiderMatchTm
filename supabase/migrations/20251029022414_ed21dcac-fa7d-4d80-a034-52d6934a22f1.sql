-- Create canonical tech tags table (lowercase)
CREATE TABLE IF NOT EXISTS tech_tags (
  tag text PRIMARY KEY
);

-- Seed with common technologies (expand as needed)
INSERT INTO tech_tags(tag) VALUES
-- Languages
('python'),('java'),('c++'),('c'),('c#'),('go'),('rust'),('swift'),('kotlin'),
('typescript'),('javascript'),('ruby'),('php'),('scala'),('r'),('matlab'),

-- Frontend
('react'),('vue'),('angular'),('svelte'),('nextjs'),('html'),('css'),('tailwind'),

-- Backend/Frameworks
('nodejs'),('node.js'),('express'),('django'),('flask'),('spring'),('fastapi'),
('.net'),('rails'),('laravel'),

-- Databases
('sql'),('postgresql'),('postgres'),('mysql'),('mongodb'),('redis'),('cassandra'),
('dynamodb'),('elasticsearch'),('sqlite'),

-- Cloud
('aws'),('gcp'),('azure'),('cloud'),('firebase'),

-- DevOps/Tools
('docker'),('kubernetes'),('k8s'),('jenkins'),('git'),('github'),('gitlab'),
('terraform'),('ansible'),('ci/cd'),

-- Data/ML
('spark'),('hadoop'),('kafka'),('airflow'),('pandas'),('numpy'),('tensorflow'),
('pytorch'),('scikit-learn'),('jupyter'),

-- Operating Systems/Tools
('linux'),('unix'),('bash'),('shell'),('windows'),('macos'),

-- Other
('graphql'),('rest'),('api'),('microservices'),('oauth'),('jwt')

ON CONFLICT DO NOTHING;

-- Normalize existing tech_stack arrays: lowercase + intersect with canonical set
UPDATE internships
SET tech_stack = (
  SELECT array_agg(DISTINCT t.tag ORDER BY t.tag)
  FROM unnest(tech_stack) s
  JOIN tech_tags t ON lower(s) = t.tag
)
WHERE is_active = true 
  AND tech_stack IS NOT NULL
  AND array_length(tech_stack, 1) > 0;

-- Create function to validate tech_stack against canonical tags
CREATE OR REPLACE FUNCTION validate_tech_stack()
RETURNS TRIGGER AS $$
DECLARE
  invalid_tag text;
BEGIN
  -- Skip if tech_stack is NULL or empty
  IF NEW.tech_stack IS NULL OR array_length(NEW.tech_stack, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check for any non-canonical tags
  SELECT s INTO invalid_tag
  FROM unnest(NEW.tech_stack) s
  LEFT JOIN tech_tags t ON lower(s) = t.tag
  WHERE t.tag IS NULL
  LIMIT 1;
  
  IF invalid_tag IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid tech tag: %. Must be from canonical tech_tags list.', invalid_tag;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to validate tech_stack on insert/update
DROP TRIGGER IF EXISTS validate_tech_stack_trigger ON internships;
CREATE TRIGGER validate_tech_stack_trigger
  BEFORE INSERT OR UPDATE OF tech_stack ON internships
  FOR EACH ROW
  EXECUTE FUNCTION validate_tech_stack();