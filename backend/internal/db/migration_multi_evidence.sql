-- Allow up to N (enforced in app) evidence documents per checklist item.
-- Drop the single-evidence UNIQUE constraint and replace with a plain index.
ALTER TABLE evidence_items
  DROP CONSTRAINT IF EXISTS evidence_items_assessment_id_checklist_item_id_key;

CREATE INDEX IF NOT EXISTS idx_evidence_assessment_item
  ON evidence_items (assessment_id, checklist_item_id);
