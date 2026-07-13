-- Migration: Add normalized_weight column to score_items
-- Date: 2026-07-08
-- Purpose: Support normalized weight calculation per profile

BEGIN;

-- Add normalized_weight column if not exists
ALTER TABLE score_items
ADD COLUMN IF NOT EXISTS normalized_weight NUMERIC(10,6) DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN score_items.normalized_weight IS
'Normalized weight calculated based on profile_code and applicability. Formula: (base_weight / sum_applicable_weights_in_pillar) * profile_target_for_pillar';

-- Update existing records to have normalized_weight = weighted_score / score
-- This is an approximation for existing data
UPDATE score_items
SET normalized_weight = CASE
    WHEN score > 0 THEN weighted_score / score
    ELSE 0
END
WHERE normalized_weight = 0 OR normalized_weight IS NULL;

COMMIT;

-- Verify the migration
SELECT
    'Migration completed' as status,
    COUNT(*) as total_score_items,
    COUNT(normalized_weight) as items_with_normalized_weight,
    ROUND(AVG(normalized_weight)::numeric, 6) as avg_normalized_weight
FROM score_items;
