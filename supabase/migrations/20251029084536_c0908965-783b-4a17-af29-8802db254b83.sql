
-- Archive Radiance Technologies, Lennox International, and Emerson Electric internships
UPDATE internships 
SET is_active = false, 
    archived_at = now()
WHERE id IN (
  '33421449-7d74-4243-a138-963490ef2fe8', -- Radiance Technologies
  '2c9844d1-e77b-463e-8c0c-baee182d787d', -- Lennox International
  '4787bfa1-6f9c-4f46-87ee-5574ed8c6593', -- Emerson Electric - Data Analyst Co-Op
  'c038b4ac-83f3-48d0-a954-4211bdddad49', -- Emerson Electric - Hardware Design Intern
  'e179d57d-2797-4acb-81c8-e9f33a891525', -- Emerson Electric - Hardware Engineering Intern - Digital
  'b7b90498-8e47-4d84-bc4b-238ad2f96d9c', -- Emerson Electric - Software Development Intern
  '9ffd655c-ced9-4e0a-bf5d-72acb0a1c80e', -- Emerson Electric - Software Engineering Intern
  'f9faceb0-87c2-41ee-bd5e-9e41d6984df8'  -- Emerson Electric - Test Engineering Intern
);
