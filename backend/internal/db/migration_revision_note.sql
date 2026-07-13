-- Note from the assessor/admin when sending an assessment back for revision.
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS revision_note TEXT;
