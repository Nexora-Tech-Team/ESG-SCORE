-- ============================================================================
-- FIX CHECKLIST ITEM WEIGHTS TO MATCH EXCEL
-- File: ESG_Score_IUP_IUJP_rev.01.xlsx
-- Date: 2026-07-08
-- ============================================================================

-- This script fixes 13 weight discrepancies between database and Excel reference

BEGIN;

-- ============================================================================
-- ENVIRONMENTAL PILLAR WEIGHT FIXES (3 items)
-- ============================================================================

-- Item 2.3: ISO 14001 (Excel: 0.0300, DB: 0.0200)
UPDATE checklist_items
SET weight = 0.0300
WHERE id = 'env-iso14001';

-- Item 3.1: GHG Inventory (Excel: 0.0300, DB: 0.0200)
UPDATE checklist_items
SET weight = 0.0300
WHERE id = 'env-ghg-inventory';

-- Item 3.5: Elektrifikasi (Excel: 0.0300, DB: 0.0200)
UPDATE checklist_items
SET weight = 0.0300
WHERE id = 'env-electrification';

-- ============================================================================
-- SOCIAL PILLAR WEIGHT FIXES (6 items)
-- ============================================================================
-- NOTE: Items 4.1-4.3 are CRITICAL - Safety weights are higher in Excel

-- Item 4.1: ISO 45001 (Excel: 0.0500, DB: 0.0300) ⚠️ CRITICAL
UPDATE checklist_items
SET weight = 0.0500
WHERE id = 'soc-zero-harm';

-- Item 4.2: LTIFR/TRIFR (Excel: 0.0400, DB: 0.0300) ⚠️ CRITICAL
UPDATE checklist_items
SET weight = 0.0400
WHERE id = 'soc-ltifr-trifr';

-- Item 4.3: Fatality (Excel: 0.0400, DB: 0.0300) ⚠️ CRITICAL
UPDATE checklist_items
SET weight = 0.0400
WHERE id = 'soc-fatality';

-- Item 5.3: Grievance Resolution (Excel: 0.0200, DB: 0.0300)
UPDATE checklist_items
SET weight = 0.0200
WHERE id = 'soc-grievance-resolution';

-- Item 5.5: Community Monitoring (Excel: 0.0200, DB: 0.0300)
UPDATE checklist_items
SET weight = 0.0200
WHERE id = 'soc-community-monitoring';

-- Item 6.3: Human Rights (Excel: 0.0200, DB: 0.0300)
UPDATE checklist_items
SET weight = 0.0200
WHERE id = 'soc-human-rights';

-- ============================================================================
-- GOVERNANCE PILLAR WEIGHT FIXES (4 items)
-- ============================================================================

-- Item 7.3: ISO 37301 (Excel: 0.0200, DB: 0.0300)
UPDATE checklist_items
SET weight = 0.0200
WHERE id = 'gov-iso37301';

-- Item 7.5: Due Diligence (Excel: 0.0200, DB: 0.0300)
UPDATE checklist_items
SET weight = 0.0200
WHERE id = 'gov-due-diligence';

-- Item 8.1: Board Oversight (Excel: 0.0300, DB: 0.0200)
UPDATE checklist_items
SET weight = 0.0300
WHERE id = 'gov-board-oversight';

-- Item 8.3: ESG ERM (Excel: 0.0300, DB: 0.0200)
UPDATE checklist_items
SET weight = 0.0300
WHERE id = 'gov-esg-erm';

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Verify all weights have been updated
SELECT
    id,
    pillar,
    category,
    question_number,
    weight,
    CASE
        WHEN id = 'env-iso14001' THEN 'Expected: 0.0300'
        WHEN id = 'env-ghg-inventory' THEN 'Expected: 0.0300'
        WHEN id = 'env-electrification' THEN 'Expected: 0.0300'
        WHEN id = 'soc-zero-harm' THEN 'Expected: 0.0500 (CRITICAL)'
        WHEN id = 'soc-ltifr-trifr' THEN 'Expected: 0.0400 (CRITICAL)'
        WHEN id = 'soc-fatality' THEN 'Expected: 0.0400 (CRITICAL)'
        WHEN id = 'soc-grievance-resolution' THEN 'Expected: 0.0200'
        WHEN id = 'soc-community-monitoring' THEN 'Expected: 0.0200'
        WHEN id = 'soc-human-rights' THEN 'Expected: 0.0200'
        WHEN id = 'gov-iso37301' THEN 'Expected: 0.0200'
        WHEN id = 'gov-due-diligence' THEN 'Expected: 0.0200'
        WHEN id = 'gov-board-oversight' THEN 'Expected: 0.0300'
        WHEN id = 'gov-esg-erm' THEN 'Expected: 0.0300'
    END as expected_value
FROM checklist_items
WHERE id IN (
    'env-iso14001',
    'env-ghg-inventory',
    'env-electrification',
    'soc-zero-harm',
    'soc-ltifr-trifr',
    'soc-fatality',
    'soc-grievance-resolution',
    'soc-community-monitoring',
    'soc-human-rights',
    'gov-iso37301',
    'gov-due-diligence',
    'gov-board-oversight',
    'gov-esg-erm'
)
ORDER BY pillar, sort_order;

-- Check total weights per pillar (should vary by profile due to applicability)
SELECT
    pillar,
    COUNT(*) as total_items,
    SUM(weight) as total_base_weight,
    ROUND(AVG(weight)::numeric, 4) as avg_weight
FROM checklist_items
GROUP BY pillar
ORDER BY pillar;

-- Summary of changes
SELECT
    '13 weight updates applied successfully' as status,
    'Environmental: 3 items updated' as env_changes,
    'Social: 6 items updated (3 CRITICAL K3 items)' as social_changes,
    'Governance: 4 items updated' as gov_changes;

COMMIT;

-- ============================================================================
-- POST-UPDATE NOTES
-- ============================================================================

-- After running this script:
-- 1. Verify all weights match Excel reference
-- 2. Test scoring calculation with sample assessment
-- 3. Validate normalized weights per profile (IUP, IUJP-*)
-- 4. Update seed.sql file for future fresh installs
-- 5. Document the changes in migration log

-- IMPORTANT: The weight normalization happens at runtime based on:
-- - applicability_tag (which profile sees which items)
-- - profile_weight_targets (E/S/G target percentages per profile)
--
-- Formula per Excel:
-- Normalized Weight = (Base Weight / Sum of Applicable Base Weights in Pillar)
--                     * Profile Target Weight for that Pillar
--
-- Example for IUP profile, Environmental pillar:
-- If item has base weight 0.03 and sum of all IUP-applicable env items = 0.35,
-- Then normalized = (0.03 / 0.35) * 0.35 = 0.03
