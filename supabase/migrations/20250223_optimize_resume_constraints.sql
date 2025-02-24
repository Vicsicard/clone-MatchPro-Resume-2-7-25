-- Add constraints and indexes for optimized resume
ALTER TABLE analyses
ALTER COLUMN optimized_resume TYPE text,
ALTER COLUMN selected_suggestion TYPE text,
ADD CONSTRAINT optimized_resume_length CHECK (length(optimized_resume) <= 100000),
ADD CONSTRAINT selected_suggestion_length CHECK (length(selected_suggestion) <= 10000);

-- Add index for faster queries
CREATE INDEX idx_analyses_optimized ON analyses(user_id) WHERE optimized_resume IS NOT NULL;
