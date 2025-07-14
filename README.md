# @supavec/supabase-ai

A TypeScript SDK for building RAG (Retrieval-Augmented Generation) applications with Supabase and pgvector.

## Features

- 🔍 **Semantic Search**: Powerful vector similarity search with pgvector
- 🤖 **OpenAI Integration**: Seamless OpenAI embeddings integration
- 📦 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🚀 **Easy Integration**: Works with your existing Supabase client
- 🔧 **Flexible Configuration**: Customizable chunk sizes, similarity thresholds, and more
- 📊 **Metadata Filtering**: Advanced filtering with JSON metadata support

## Installation

```bash
npm install @supavec/supabase-ai
```

The package includes both CommonJS and ES module builds, with full TypeScript support.

## Prerequisites

Before using this SDK, you need:

1. **Supabase project** with pgvector extension enabled
2. **Database tables** set up for storing embeddings
3. **RPC functions** for similarity search

### Required Database Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  embedding vector(1536), -- Adjust dimensions based on your model
  metadata jsonb DEFAULT '{}',
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);

-- Create RPC function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  table_name text,
  filters jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
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
      1 - (embedding <=> $1) as similarity
    FROM %I
    WHERE 1 - (embedding <=> $1) > $2
    ORDER BY embedding <=> $1
    LIMIT $3
  ', table_name)
  USING query_embedding, match_threshold, match_count;
END;
$$;
```

## Quick Start

```typescript
// ES modules
import { createClient } from '@supabase/supabase-js'
import { SupabaseAI } from '@supavec/supabase-ai'

// CommonJS
// const { createClient } = require('@supabase/supabase-js')
// const { SupabaseAI } = require('@supavec/supabase-ai')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Initialize SupabaseAI
const ai = new SupabaseAI(supabase, {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-small'
})

// Store documents
await ai.embeddings.store([
  {
    content: 'The quick brown fox jumps over the lazy dog.',
    metadata: { title: 'Example Document', type: 'text' }
  }
], {
  table: 'documents'
})

// Search documents
const results = await ai.embeddings.search('fox jumping', {
  table: 'documents',
  limit: 5,
  threshold: 0.8
})

console.log(results)
```

## API Reference

### SupabaseAI

Main client class for interacting with the SDK.

```typescript
const ai = new SupabaseAI(supabaseClient, options)
```

#### Options

- `apiKey`: `string` - OpenAI API key
- `model?`: `string` - OpenAI model name (default: 'text-embedding-3-small')
- `defaultTable?`: `string` - Default table for operations
- `defaultChunkSize?`: `number` - Default chunk size for text processing
- `defaultThreshold?`: `number` - Default similarity threshold

### EmbeddingsClient

Handle embedding operations and semantic search.

#### Methods

##### `store(data, options)`

Store documents with automatic embedding generation.

```typescript
await ai.embeddings.store([
  {
    content: 'Document text content',
    metadata: { title: 'Document Title', category: 'tech' },
    user_id: 'user123'
  }
], {
  table: 'documents',
  chunkSize: 1000,
  overlap: 100
})
```

##### `search(query, options)`

Perform semantic search on stored documents.

```typescript
const results = await ai.embeddings.search('search query', {
  table: 'documents',
  limit: 10,
  threshold: 0.8,
  filters: { user_id: 'user123' },
  metadata: { category: 'tech' },
  select: 'id, content, metadata, created_at',
  orderBy: 'similarity',
  includeDistance: true
})
```

**Search Options:**
- `table`: Required table name
- `limit?`: Maximum results (default: 10)
- `threshold?`: Similarity threshold (default: 0.8)
- `filters?`: SQL-style filters for table columns
- `metadata?`: JSON metadata filters
- `select?`: Custom SELECT clause
- `orderBy?`: Sort order ('similarity' | 'created_at' | column name)
- `includeDistance?`: Include similarity scores in results
- `rpc?`: Custom RPC function name

##### `create(input, options?)`

Generate embeddings for text input.

```typescript
const embeddings = await ai.embeddings.create(['text1', 'text2'])
```

##### `similarity(text1, text2)`

Calculate similarity between two text strings.

```typescript
const score = await ai.embeddings.similarity('hello world', 'hello there')
```

## Advanced Usage

### Complex Search Queries

```typescript
const results = await ai.embeddings.search('machine learning concepts', {
  table: 'knowledge_base',
  limit: 20,
  threshold: 0.85,
  filters: {
    created_at: { gte: '2024-01-01' },
    status: 'published',
    user_id: userId
  },
  metadata: {
    category: 'technical',
    tags: ['ai', 'ml']
  },
  select: 'id, content, title, metadata, created_at, author',
  orderBy: 'similarity',
  includeDistance: true
})
```

### Batch Operations

```typescript
const documents = [
  { content: 'Document 1', metadata: { type: 'article' } },
  { content: 'Document 2', metadata: { type: 'blog' } },
  // ... more documents
]

await ai.embeddings.store(documents, {
  table: 'documents',
  batchSize: 50, // Process in batches of 50
  chunkSize: 1000,
  overlap: 100
})
```

## Error Handling

The SDK provides comprehensive error handling:

```typescript
import { 
  SupabaseAIError, 
  EmbeddingProviderError, 
  DatabaseError, 
  ValidationError 
} from '@supavec/supabase-ai'

try {
  await ai.embeddings.search('query', { table: 'documents' })
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation error:', error.message)
  } else if (error instanceof DatabaseError) {
    console.error('Database error:', error.message)
  } else if (error instanceof EmbeddingProviderError) {
    console.error('Provider error:', error.message)
  }
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import { SearchResult, SearchOptions, StoreData } from '@supavec/supabase-ai'

const searchOptions: SearchOptions = {
  table: 'documents',
  limit: 10,
  threshold: 0.8
}

const results: SearchResult[] = await ai.embeddings.search('query', searchOptions)
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## License

MIT License - see LICENSE file for details.