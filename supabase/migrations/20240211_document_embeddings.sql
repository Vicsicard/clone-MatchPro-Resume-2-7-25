-- Enable vector extension and create table
create extension if not exists vector;

create table document_embeddings (
    id uuid primary key default gen_random_uuid(),
    content_type text not null,
    content text,
    embedding vector(1024),
    metadata jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create similarity search function
create function match_documents(query_embedding vector(1024))
returns table (id uuid, content_type text, similarity float)
language plpgsql
as $$
begin
    return query
    select
        id,
        content_type,
        1 - (embedding <=> query_embedding) as similarity
    from document_embeddings
    order by embedding <=> query_embedding
    limit 5;
end;
$$;
