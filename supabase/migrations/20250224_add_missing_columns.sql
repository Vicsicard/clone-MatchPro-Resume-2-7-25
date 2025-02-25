-- Add missing columns to analyses table
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS similarity_score float,
ADD COLUMN IF NOT EXISTS suggestions jsonb,
ADD COLUMN IF NOT EXISTS content_json jsonb;
