-- Add English translation to verbs for the info popover.
-- Populated at generation time for new verbs; existing rows backfilled
-- on-demand via POST /api/conjugar/verbs/[verbId]/translate.

ALTER TABLE verbs ADD COLUMN IF NOT EXISTS translation_en TEXT;
