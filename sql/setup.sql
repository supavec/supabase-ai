-- Setup script for @supavec/supabase-ai
-- Run this in your Supabase SQL editor to set up the required database structure

-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  embedding vector(1536), -- Adjust dimensions based on your embedding model
  metadata jsonb DEFAULT '{}',
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents(user_id);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents(created_at);
CREATE INDEX IF NOT EXISTS documents_metadata_idx ON documents USING gin(metadata);

-- 4. Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create trigger for automatic timestamp updates
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Create the main RPC function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 10,
  table_name text DEFAULT 'documents',
  filters jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  where_clause text := '';
  filter_key text;
  filter_value jsonb;
BEGIN
  -- Build WHERE clause from filters
  IF filters != '{}' THEN
    where_clause := ' AND ';
    FOR filter_key, filter_value IN SELECT * FROM jsonb_each(filters) LOOP
      where_clause := where_clause || filter_key || ' = ' || quote_literal(filter_value #>> '{}') || ' AND ';
    END LOOP;
    -- Remove trailing ' AND '
    where_clause := rtrim(where_clause, ' AND ');
  END IF;

  RETURN QUERY
  EXECUTE format('
    SELECT 
      id,
      content,
      metadata,
      (1 - (embedding <=> $1))::float as similarity,
      created_at,
      updated_at
    FROM %I
    WHERE (1 - (embedding <=> $1)) > $2 %s
    ORDER BY embedding <=> $1
    LIMIT $3
  ', table_name, where_clause)
  USING query_embedding, match_threshold, match_count;
END;
$$;

-- 7. Create a specialized function for metadata filtering
CREATE OR REPLACE FUNCTION match_documents_with_metadata(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 10,
  table_name text DEFAULT 'documents',
  metadata_filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    SELECT 
      id,
      content,
      metadata,
      (1 - (embedding <=> $1))::float as similarity,
      created_at,
      updated_at
    FROM %I
    WHERE (1 - (embedding <=> $1)) > $2
      AND ($4 = ''{}'' OR metadata @> $4)
    ORDER BY embedding <=> $1
    LIMIT $3
  ', table_name)
  USING query_embedding, match_threshold, match_count, metadata_filter;
END;
$$;

-- 8. Create function for hybrid search (combine similarity with text search)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(1536),
  search_text text,
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 10,
  table_name text DEFAULT 'documents'
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  text_rank float,
  combined_score float,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    SELECT 
      id,
      content,
      metadata,
      (1 - (embedding <=> $1))::float as similarity,
      ts_rank(to_tsvector(content), plainto_tsquery($2))::float as text_rank,
      ((1 - (embedding <=> $1)) * 0.7 + ts_rank(to_tsvector(content), plainto_tsquery($2)) * 0.3)::float as combined_score,
      created_at,
      updated_at
    FROM %I
    WHERE (1 - (embedding <=> $1)) > $3
      OR to_tsvector(content) @@ plainto_tsquery($2)
    ORDER BY combined_score DESC
    LIMIT $4
  ', table_name)
  USING query_embedding, search_text, match_threshold, match_count;
END;
$$;

-- 9. Create RLS policies (optional - adjust based on your security requirements)
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for user-specific access
-- CREATE POLICY "Users can only access their own documents" ON documents
--   FOR ALL USING (auth.uid() = user_id);

-- 10. Grant necessary permissions
-- GRANT USAGE ON SCHEMA public TO authenticated, anon;
-- GRANT ALL ON documents TO authenticated, anon;
-- GRANT EXECUTE ON FUNCTION match_documents TO authenticated, anon;
-- GRANT EXECUTE ON FUNCTION match_documents_with_metadata TO authenticated, anon;
-- GRANT EXECUTE ON FUNCTION hybrid_search TO authenticated, anon;

-- Setup complete!
-- You can now use @supavec/supabase-ai with your Supabase project.