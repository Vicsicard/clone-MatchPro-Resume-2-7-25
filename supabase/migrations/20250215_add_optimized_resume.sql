-- Add columns for optimized resume and selected suggestion
ALTER TABLE analyses
ADD COLUMN optimized_resume TEXT,
ADD COLUMN selected_suggestion TEXT;
