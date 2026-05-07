-- 1. Cyril Amarchand: HQ Mumbai, not Singapore
UPDATE firm_profiles
SET hq_city = 'Mumbai',
    offices = ARRAY['Mumbai','Delhi','Bengaluru','Chennai','Hyderabad','Ahmedabad','Gurugram']::text[],
    office_count = 7,
    founded_year = NULL,
    updated_at = now()
WHERE firm_slug = 'cyril-amarchand-mangaldas';

DELETE FROM firm_offices WHERE firm_slug = 'cyril-amarchand-mangaldas';
INSERT INTO firm_offices (firm_slug, city, address, is_hq) VALUES
  ('cyril-amarchand-mangaldas','Mumbai',NULL,TRUE),
  ('cyril-amarchand-mangaldas','Delhi',NULL,FALSE),
  ('cyril-amarchand-mangaldas','Bengaluru',NULL,FALSE),
  ('cyril-amarchand-mangaldas','Chennai',NULL,FALSE),
  ('cyril-amarchand-mangaldas','Hyderabad',NULL,FALSE),
  ('cyril-amarchand-mangaldas','Ahmedabad',NULL,FALSE),
  ('cyril-amarchand-mangaldas','Gurugram',NULL,FALSE);

-- 2. Drop duplicate Cyril Shroff & Co
DELETE FROM firm_offices  WHERE firm_slug = 'cyril-shroff-co';
DELETE FROM firm_practice_areas WHERE firm_slug = 'cyril-shroff-co';
DELETE FROM firm_team_members  WHERE firm_slug = 'cyril-shroff-co';
DELETE FROM firm_comparable_index WHERE firm_slug = 'cyril-shroff-co' OR comparable_slug = 'cyril-shroff-co';
DELETE FROM firm_profiles WHERE firm_slug = 'cyril-shroff-co';

-- 3. Generic cleanup: junk office addresses → NULL
UPDATE firm_offices
SET address = NULL
WHERE address IS NOT NULL
  AND (
    lower(address) ~ '(talk to us|let us know|write to us|home page|contact us|enquir|navigation)'
    OR length(trim(address)) < 12
    OR address ~ '^[\d\s\+\-\(\)]+$'
  );

-- 4. Drop garbage office rows (Unknown city, no address, not HQ)
DELETE FROM firm_offices
WHERE (city IS NULL OR lower(city) IN ('unknown','n/a','none','') OR length(trim(city)) < 2)
  AND is_hq = FALSE;

-- 5. Normalize city aliases
UPDATE firm_offices SET city = 'Bengaluru' WHERE lower(city) = 'bangalore';
UPDATE firm_offices SET city = 'Gurugram'  WHERE lower(city) = 'gurgaon';
UPDATE firm_offices SET city = 'Delhi'     WHERE lower(city) IN ('new delhi','delhi ncr');
UPDATE firm_profiles SET hq_city = 'Bengaluru' WHERE lower(hq_city) = 'bangalore';
UPDATE firm_profiles SET hq_city = 'Gurugram'  WHERE lower(hq_city) = 'gurgaon';
UPDATE firm_profiles SET hq_city = 'Delhi'     WHERE lower(hq_city) IN ('new delhi','delhi ncr');

-- 6. Recompute office_count from cleaned firm_offices
UPDATE firm_profiles p
SET office_count = sub.cnt,
    updated_at   = now()
FROM (SELECT firm_slug, COUNT(*) AS cnt FROM firm_offices GROUP BY firm_slug) sub
WHERE p.firm_slug = sub.firm_slug;

-- 7. Null out junk partner ratios
UPDATE firm_profiles
SET partner_associate_ratio = NULL
WHERE partner_associate_ratio IS NOT NULL
  AND (total_lawyers IS NULL OR partner_count IS NULL OR total_lawyers <= partner_count);

-- 8. Null obviously-wrong founded_year (CAM showed "2022" in CSV — website redesign year)
UPDATE firm_profiles
SET founded_year = NULL
WHERE founded_year IS NOT NULL AND (founded_year < 1850 OR founded_year > 2025);