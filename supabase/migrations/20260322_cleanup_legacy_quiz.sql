-- ============================================================
-- Phase 6: Cleanup Legacy Quiz Tables
-- Run AFTER verifying the quiz-in-lessons feature works.
-- This migration is irreversible — it drops the old tables
-- and columns that the old quiz system relied on.
-- ============================================================

-- 1. Delete orphaned rows (quiz_id IS NULL means they were never
--    backfilled during Phase 0 migration)
DELETE FROM quiz_progress WHERE quiz_id IS NULL;
DELETE FROM quiz_results WHERE quiz_id IS NULL;

-- 2. Make quiz_id NOT NULL now that all orphans are purged
ALTER TABLE quiz_progress ALTER COLUMN quiz_id SET NOT NULL;
ALTER TABLE quiz_results ALTER COLUMN quiz_id SET NOT NULL;

-- 3. Drop the old string-based unique constraint on quiz_progress
--    (the new constraint quiz_progress_user_quiz_id_unique replaces it)
ALTER TABLE quiz_progress
  DROP CONSTRAINT IF EXISTS quiz_progress_user_id_quiz_title_key;

-- 4. Drop old string-based columns
ALTER TABLE quiz_progress DROP COLUMN IF EXISTS quiz_title;
ALTER TABLE quiz_results DROP COLUMN IF EXISTS lesson_title;
ALTER TABLE quiz_results DROP COLUMN IF EXISTS lesson_number;
ALTER TABLE quiz_results DROP COLUMN IF EXISTS unit_number;

-- 5. Drop the legacy saved_quizzes table entirely
DROP TABLE IF EXISTS saved_quizzes;
