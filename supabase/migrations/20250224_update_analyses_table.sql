-- Add missing columns to analyses table
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_path text,
ADD COLUMN IF NOT EXISTS file_format text,
ADD COLUMN IF NOT EXISTS job_description_path text,
ADD COLUMN IF NOT EXISTS content_json jsonb,
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('uploading', 'processing', 'completed', 'failed')),
ALTER COLUMN status DROP CONSTRAINT IF EXISTS analyses_status_check,
ALTER COLUMN status ADD CONSTRAINT analyses_status_check CHECK (status IN ('uploading', 'processing', 'completed', 'failed'));
