# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is @supavec/supabase-ai, a TypeScript SDK for building RAG (Retrieval-Augmented Generation) applications with Supabase and pgvector. The SDK provides semantic search capabilities with OpenAI embeddings and includes comprehensive TypeScript support.

## Key Development Commands

### Build and Development
- `npm run build` - Bundle TypeScript library with tsup (dual CJS/ESM output)
- `npm run dev` - Watch mode bundling with tsup
- `npm run lint` - Run ESLint on src/ directory
- `npm test` - Run Jest tests
- `npm run prepublishOnly` - Build before publishing

### Testing
- `npm test` - Run all tests with Jest
- Tests are excluded from TypeScript compilation (see tsconfig.json)

## Architecture Overview

### Core Components
1. **SupabaseAI** (`src/client.ts`) - Main client class that orchestrates the SDK
2. **EmbeddingsClient** (`src/embeddings/EmbeddingsClient.ts`) - Handles embedding operations and semantic search
3. **OpenAI Provider** (`src/embeddings/providers/openai.ts`) - OpenAI embeddings integration
4. **Type Definitions** (`src/types/`) - Comprehensive TypeScript types for all operations

### Key Architecture Patterns
- **OpenAI Integration**: Direct integration with OpenAI embeddings API
- **Configuration-driven**: Options passed through constructor with sensible defaults
- **Error Handling**: Comprehensive error types (ValidationError, DatabaseError, etc.)
- **Batch Processing**: Built-in support for batch operations with configurable sizes

### Data Flow
1. Text input → Chunking (configurable size/overlap) → Embeddings generation → Supabase storage
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
- ESLint with TypeScript rules
- All exports go through index.ts files
- Error classes extend base SupabaseAIError types
- Comprehensive type definitions for all public APIs
- **Type Imports**: Use `import type` for interfaces and type definitions, regular `import` for classes and runtime values

## Development Notes

- The SDK is designed as a library, not an application
- Main entry point: `src/index.ts`
- Built artifacts go to `dist/` directory (CJS: index.js, ESM: index.mjs, Types: index.d.ts)
- Uses pnpm for package management
- Build system: tsup for fast bundling with dual format output
- Peer dependency on @supabase/supabase-js ^2.0.0
- OpenAI dependency for embeddings provider

## Testing Strategy

- Jest for unit testing
- Test files excluded from build output
- Focus on provider implementations and client functionality
- Mock Supabase client for testing