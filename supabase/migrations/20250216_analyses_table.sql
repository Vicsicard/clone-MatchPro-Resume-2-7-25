-- Create enum for analysis status
CREATE TYPE analysis_status AS ENUM ('processing', 'completed', 'failed');

-- Create analyses table
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_format TEXT NOT NULL,
    status analysis_status NOT NULL DEFAULT 'processing',
    content_json JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own analyses
CREATE POLICY "Users can view their own analyses"
    ON public.analyses
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Create policy to allow service role to manage all analyses
CREATE POLICY "Service role can manage all analyses"
    ON public.analyses
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.analyses TO service_role;
GRANT SELECT ON public.analyses TO authenticated;
