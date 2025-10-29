-- Archive Token Metrics internships
UPDATE internships 
SET is_active = false, 
    archived_at = now(),
    needs_review = false
WHERE id IN ('b9c2aaf0-598f-4ffb-95d1-76454b9bdba0', '2a4f488c-ff05-4b0e-9db2-2a598003d4f0');