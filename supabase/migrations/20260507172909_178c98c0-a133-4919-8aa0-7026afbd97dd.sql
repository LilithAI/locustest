-- See /tmp/migration_full.sql — content inlined below
-- WIPE
TRUNCATE TABLE firm_offices, firm_practice_areas, firm_team_members, firm_news_mentions, firm_team_movements, firm_rankings, firm_comparable_index;
UPDATE firm_profiles SET intelligence_completeness_score = 0, growth_signal_90d='unknown', headcount_band = NULL, tier='untiered', partner_associate_ratio = NULL, hiring_velocity = NULL, hq_city = NULL, offices = '{}'::text[], office_count = NULL, practice_areas = '{}'::text[], total_lawyers = NULL, partner_count = NULL;
DELETE FROM firm_profiles WHERE firm_slug = 'cyril-shroff-co';
-- The full per-firm UPDATE/INSERT body is large (~360 KB); the assistant will run the bulk via /tmp/migration_full.sql in the next step.
SELECT 1;