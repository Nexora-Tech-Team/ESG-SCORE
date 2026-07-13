-- ============================================================================
-- VALIDATION QUERY: Checklist Weights vs Excel Reference
-- Run this AFTER applying fix_weights.sql
-- ============================================================================

-- Check all 13 items that were fixed
SELECT
    CASE
        WHEN weight = 0.0500 AND id = 'soc-zero-harm' THEN '✅'
        WHEN weight = 0.0400 AND id = 'soc-ltifr-trifr' THEN '✅'
        WHEN weight = 0.0400 AND id = 'soc-fatality' THEN '✅'
        WHEN weight = 0.0300 AND id IN ('env-iso14001', 'env-ghg-inventory', 'env-electrification', 'gov-board-oversight', 'gov-esg-erm') THEN '✅'
        WHEN weight = 0.0200 AND id IN ('soc-grievance-resolution', 'soc-community-monitoring', 'soc-human-rights', 'gov-iso37301', 'gov-due-diligence') THEN '✅'
        ELSE '❌'
    END as status,
    id,
    question_number as kode,
    pillar,
    weight as current_weight,
    CASE
        WHEN id = 'soc-zero-harm' THEN 0.0500
        WHEN id = 'soc-ltifr-trifr' THEN 0.0400
        WHEN id = 'soc-fatality' THEN 0.0400
        WHEN id IN ('env-iso14001', 'env-ghg-inventory', 'env-electrification', 'gov-board-oversight', 'gov-esg-erm') THEN 0.0300
        WHEN id IN ('soc-grievance-resolution', 'soc-community-monitoring', 'soc-human-rights', 'gov-iso37301', 'gov-due-diligence') THEN 0.0200
    END as expected_weight,
    CASE
        WHEN id = 'soc-zero-harm' THEN 'CRITICAL K3'
        WHEN id = 'soc-ltifr-trifr' THEN 'CRITICAL K3'
        WHEN id = 'soc-fatality' THEN 'CRITICAL K3'
        ELSE 'MEDIUM'
    END as priority
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
ORDER BY
    CASE pillar
        WHEN 'environmental' THEN 1
        WHEN 'social' THEN 2
        WHEN 'governance' THEN 3
    END,
    sort_order;

-- Summary check
SELECT
    CASE
        WHEN COUNT(*) = 13 THEN '✅ All 13 items found'
        ELSE '❌ Missing items: ' || (13 - COUNT(*))::text
    END as item_check,
    CASE
        WHEN SUM(CASE WHEN id = 'soc-zero-harm' AND weight = 0.0500 THEN 1 ELSE 0 END) = 1
         AND SUM(CASE WHEN id = 'soc-ltifr-trifr' AND weight = 0.0400 THEN 1 ELSE 0 END) = 1
         AND SUM(CASE WHEN id = 'soc-fatality' AND weight = 0.0400 THEN 1 ELSE 0 END) = 1
        THEN '✅ K3 weights CORRECT'
        ELSE '❌ K3 weights INCORRECT'
    END as k3_check,
    CASE
        WHEN SUM(CASE WHEN id IN ('env-iso14001', 'env-ghg-inventory', 'env-electrification') AND weight = 0.0300 THEN 1 ELSE 0 END) = 3
        THEN '✅ Environmental weights CORRECT'
        ELSE '❌ Environmental weights INCORRECT'
    END as env_check,
    CASE
        WHEN SUM(CASE WHEN id IN ('soc-grievance-resolution', 'soc-community-monitoring', 'soc-human-rights') AND weight = 0.0200 THEN 1 ELSE 0 END) = 3
        THEN '✅ Social (other) weights CORRECT'
        ELSE '❌ Social (other) weights INCORRECT'
    END as social_check,
    CASE
        WHEN SUM(CASE WHEN id IN ('gov-iso37301', 'gov-due-diligence') AND weight = 0.0200 THEN 1 ELSE 0 END) = 2
         AND SUM(CASE WHEN id IN ('gov-board-oversight', 'gov-esg-erm') AND weight = 0.0300 THEN 1 ELSE 0 END) = 2
        THEN '✅ Governance weights CORRECT'
        ELSE '❌ Governance weights INCORRECT'
    END as gov_check
FROM checklist_items
WHERE id IN (
    'env-iso14001', 'env-ghg-inventory', 'env-electrification',
    'soc-zero-harm', 'soc-ltifr-trifr', 'soc-fatality',
    'soc-grievance-resolution', 'soc-community-monitoring', 'soc-human-rights',
    'gov-iso37301', 'gov-due-diligence', 'gov-board-oversight', 'gov-esg-erm'
);

-- Total weight distribution per pillar
SELECT
    pillar,
    COUNT(*) as total_items,
    ROUND(SUM(weight)::numeric, 4) as total_base_weight,
    ROUND(MIN(weight)::numeric, 4) as min_weight,
    ROUND(MAX(weight)::numeric, 4) as max_weight,
    ROUND(AVG(weight)::numeric, 4) as avg_weight
FROM checklist_items
GROUP BY pillar
ORDER BY pillar;

-- Check if all 49 items exist
SELECT
    CASE
        WHEN COUNT(*) = 49 THEN '✅ All 49 checklist items present'
        ELSE '❌ Expected 49, found: ' || COUNT(*)::text
    END as total_count_check
FROM checklist_items;

-- Final validation message
SELECT
    '🎯 VALIDATION COMPLETE' as status,
    'If all checks show ✅, master data is READY' as message,
    'Compare with Excel: ESG_Score_IUP_IUJP_rev.01.xlsx' as reference;
