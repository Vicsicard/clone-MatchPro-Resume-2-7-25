-- Update the vector dimensions for document_embeddings table
ALTER TABLE document_embeddings 
ALTER COLUMN embedding TYPE vector(1024);

-- Drop and recreate the match_documents function with new dimensions
DROP FUNCTION IF EXISTS match_documents;
CREATE FUNCTION match_documents(query_embedding vector(1024), match_threshold float, match_count int)
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
