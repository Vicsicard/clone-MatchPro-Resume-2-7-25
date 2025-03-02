-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    status text CHECK (status IN ('processing', 'completed', 'failed')),
    resume_name text,
    job_description_name text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz,
    error text,
    results jsonb,
    similarity_score float,
    suggestions jsonb,
    content_json jsonb
);

-- Create document_embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    content text,
    embedding vector(1024),
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz
);

-- Create match_documents function
CREATE OR REPLACE FUNCTION match_documents(query_embedding vector(1024), match_threshold float, match_count int)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        document_embeddings.id,
        document_embeddings.content,
        document_embeddings.metadata,
        1 - (document_embeddings.embedding <=> query_embedding) as similarity
    FROM document_embeddings
    WHERE 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
