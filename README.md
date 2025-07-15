# @supavec/supabase-ai

A TypeScript SDK for building RAG (Retrieval-Augmented Generation) applications with Supabase and pgvector.

## Features

- 🔍 **Semantic Search**: Powerful vector similarity search with pgvector
- 🤖 **OpenAI Integration**: Seamless OpenAI embeddings integration
- 📦 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🚀 **Easy Integration**: Works with your existing Supabase client
- 🔧 **Flexible Configuration**: Customizable similarity thresholds and more
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
  embeddings: {
    provider: 'openai', // Currently only OpenAI is supported
    model: 'text-embedding-3-small',
    table: 'documents',
    threshold: 0.8
  }
})

// Store documents (pre-chunked)
await ai.embeddings.store([
  {
    content: 'The quick brown fox jumps over the lazy dog.',
    metadata: { title: 'Example Document', type: 'text' }
  }
]) // Uses default table from config

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
- `embeddings?`: `object` - Embeddings configuration
  - `provider?`: `"openai"` - Embedding provider (currently only OpenAI is supported)
  - `model?`: `string` - OpenAI model name (default: 'text-embedding-3-small')
  - `table?`: `string` - Default table for operations
  - `threshold?`: `number` - Default similarity threshold (default: 0.8)

### EmbeddingsClient

Handle embedding operations and semantic search.

#### Methods

##### `store(data, options?)`

Store documents with automatic embedding generation. Each item in the data array should represent a single, pre-chunked piece of content.

```typescript
// Using default table from config
await ai.embeddings.store([
  {
    content: 'Document text content (pre-chunked)',
    metadata: { title: 'Document Title', category: 'tech' },
    user_id: 'user123'
  }
])

// Or specify options
await ai.embeddings.store([...], {
  table: 'custom_table',
  batchSize: 50
})
```

**Store Options:**
- `table?`: Table name (optional if embeddings.table is set)
- `generateId?`: Generate IDs using SDK (default: false, lets database auto-generate)
- `batchSize?`: Number of records to insert per batch (default: 100)

**ID Handling:**
- By default, the SDK lets your database auto-generate IDs (recommended for UUID primary keys)
- If your data includes `id` fields, they will be used
- Set `generateId: true` to force SDK-generated IDs when no ID is provided

**LangChain Integration:**
The store method accepts both native format and LangChain Documents directly:

```typescript
import { Document } from 'langchain/document'

// LangChain Documents work directly
const langchainDocs = [
  new Document({ pageContent: "LangChain document content", metadata: { source: "web" } })
]
await ai.embeddings.store(langchainDocs)

// Mixed formats also work
await ai.embeddings.store([
  new Document({ pageContent: "LangChain doc", metadata: { type: "langchain" } }),
  { content: "Native format doc", metadata: { type: "native" } }
])
```

**Note**: Content should be pre-chunked using your preferred method (LangChain text splitters, etc.) before passing to the store method.

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
- `table?`: Table name (optional if embeddings.table is set)
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

### LangChain Integration

Complete example using LangChain text splitters:

```typescript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'

// Split large document using LangChain
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
})

const docs = await textSplitter.createDocuments([
  'Your large document text here...',
], [{ source: 'document.pdf', author: 'John Doe' }])

// Store directly - no conversion needed
await ai.embeddings.store(docs)

// Search works the same way
const results = await ai.embeddings.search('query about the document')
```

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
// Pre-chunk your documents using your preferred method
const documents = [
  { content: 'Document 1 chunk 1', metadata: { type: 'article', chunk: 1 } },
  { content: 'Document 1 chunk 2', metadata: { type: 'article', chunk: 2 } },
  { content: 'Document 2 chunk 1', metadata: { type: 'blog', chunk: 1 } },
  // ... more pre-chunked documents
]

// With custom IDs
const documentsWithIds = [
  { id: 'doc1-chunk1', content: 'Document 1 chunk 1', metadata: { type: 'article' } },
  { id: 'doc1-chunk2', content: 'Document 1 chunk 2', metadata: { type: 'article' } },
]

// Using default table from config
await ai.embeddings.store(documents, {
  batchSize: 50 // Process in batches of 50
})

// Or specify custom table
await ai.embeddings.store(documents, {
  table: 'custom_documents',
  batchSize: 50
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