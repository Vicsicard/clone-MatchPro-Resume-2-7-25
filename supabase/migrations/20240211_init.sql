-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
    resume_name TEXT,
    job_description_name TEXT,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON analyses;
DROP POLICY IF EXISTS "Service role full access" ON analyses;

-- Create new policies that include service role access
CREATE POLICY "Users can view own analyses" ON analyses
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        auth.jwt()->>'role' = 'service_role' OR 
        current_setting('request.jwt.claim.role', true) = 'service_role'
    );

CREATE POLICY "Users can insert own analyses" ON analyses
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR 
        auth.jwt()->>'role' = 'service_role' OR 
        current_setting('request.jwt.claim.role', true) = 'service_role'
    );

CREATE POLICY "Users can update own analyses" ON analyses
    FOR UPDATE
    USING (
        auth.uid() = user_id OR 
        auth.jwt()->>'role' = 'service_role' OR 
        current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_analyses_updated_at
    BEFORE UPDATE ON analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create document_embeddings table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for document_embeddings
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for document_embeddings
DROP POLICY IF EXISTS "Service role can manage document_embeddings" ON document_embeddings;

-- Create policy to allow service role to manage document_embeddings
CREATE POLICY "Service role can manage document_embeddings" ON document_embeddings
    FOR ALL
    USING (
        auth.jwt()->>'role' = 'service_role' OR 
        current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON analyses TO authenticated;
GRANT SELECT, INSERT ON document_embeddings TO authenticated;
GRANT USAGE ON SEQUENCE analyses_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE document_embeddings_id_seq TO authenticated;
