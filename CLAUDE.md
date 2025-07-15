# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is @supavec/supabase-ai, a TypeScript SDK for building RAG (Retrieval-Augmented Generation) applications with Supabase and pgvector. The SDK provides semantic search capabilities with OpenAI embeddings, native LangChain Document support, and includes comprehensive TypeScript support.

## Key Development Commands

### Build and Development
- `npm run build` - Bundle TypeScript library with tsup (dual CJS/ESM output)
- `npm run dev` - Watch mode bundling with tsup
- `npm test` - Run Vitest tests
- `npm run prepublishOnly` - Build before publishing

### Testing
- `npm test` - Run all tests with Vitest
- Tests are excluded from TypeScript compilation (see tsconfig.json)
- Comprehensive unit tests for core components (client, embeddings)
- GitHub Actions CI runs tests on PRs to main branch

## Architecture Overview

### Core Components
1. **SupabaseAI** (`src/client.ts`) - Main client class that orchestrates the SDK
2. **EmbeddingsClient** (`src/embeddings/EmbeddingsClient.ts`) - Handles embedding operations and semantic search
3. **OpenAI Provider** (`src/embeddings/providers/openai.ts`) - OpenAI embeddings integration
4. **Type Definitions** (`src/types/`) - Comprehensive TypeScript types for all operations

### Key Architecture Patterns
- **OpenAI Integration**: Direct integration with OpenAI embeddings API (currently the only supported provider)
- **LangChain Compatibility**: Native support for LangChain Document objects without conversion
- **Nested Configuration**: Feature-specific options (embeddings config separate from core options)
- **Error Handling**: Comprehensive error types (ValidationError, DatabaseError, etc.)
- **Batch Processing**: Built-in support for batch operations with configurable sizes

### Data Flow
1. Pre-chunked text input (native format or LangChain Documents) → Input normalization → Embeddings generation → Supabase database (with batch processing)
2. Search query → Embedding generation → Vector similarity search → Filtered results

## Database Requirements

The SDK requires specific Supabase setup:
- pgvector extension enabled
- Documents table with vector columns
- RPC function `match_documents` for similarity search
- See `sql/setup.sql` for complete setup

## Code Conventions

- TypeScript with strict mode enabled
- Dual module format: CommonJS and ESM outputs via tsup
- All exports go through index.ts files
- Error classes extend base SupabaseAIError types
- Comprehensive type definitions for all public APIs
- **Type Imports**: Use `import type` for interfaces and type definitions, regular `import` for classes and runtime values
- **Nullish Coalescing**: Always use nullish coalescing operator (`??`) instead of logical OR (`||`) for default values to ensure only `null` and `undefined` trigger fallbacks

## Development Notes

- The SDK is designed as a library, not an application
- Main entry point: `src/index.ts`
- Built artifacts go to `dist/` directory (CJS: index.js, ESM: index.mjs, Types: index.d.ts)
- Uses pnpm for package management
- Build system: tsup for fast bundling with dual format output
- Peer dependency on @supabase/supabase-js ^2.0.0
- OpenAI dependency for embeddings provider

## Testing Strategy

- Vitest for unit testing with fast execution
- Test files excluded from build output  
- Comprehensive test coverage for core components:
  - SupabaseAI client class (constructor, getters, validation)
  - EmbeddingsClient (store, search, similarity methods)
  - Input normalization (LangChain Document support)
  - Error handling and edge cases
- Mock Supabase client and embedding providers for testing
- GitHub Actions CI automatically runs tests on PRs to main branch