-- Run this in your Supabase SQL Editor to add PDF fields to the lessons table
-- and create the lesson-pdfs storage bucket.

-- 1. Add PDF columns to lessons table
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS pdf_name TEXT,
  ADD COLUMN IF NOT EXISTS pdf_size INTEGER;

-- 2. Create the lesson-pdfs storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-pdfs', 'lesson-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies for storage: authenticated users can manage their own files
CREATE POLICY "Users can upload their own PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lesson-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lesson-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lesson-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'lesson-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
