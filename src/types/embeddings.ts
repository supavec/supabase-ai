import { SupabaseClient } from '@supabase/supabase-js'

export interface SupabaseAIOptions {
  apiKey: string
  model?: string
  defaultTable?: string
  defaultChunkSize?: number
  defaultThreshold?: number
}

export interface CreateOptions {
  model?: string
  dimensions?: number
}

export interface StoreData {
  content: string
  metadata?: Record<string, any>
  id?: string
  [key: string]: any
}

export interface StoreOptions {
  table: string
  chunkSize?: number
  overlap?: number
  generateId?: boolean
  batchSize?: number
}

export interface SearchOptions {
  table: string
  limit?: number
  threshold?: number
  filters?: Record<string, any>
  metadata?: Record<string, any>
  select?: string
  orderBy?: 'similarity' | 'created_at' | string
  includeDistance?: boolean
  rpc?: string
}

export interface SearchResult {
  id: string
  content: string
  metadata?: Record<string, any>
  similarity?: number
  created_at?: string
  [key: string]: any
}

export interface EmbeddingProvider {
  createEmbedding(input: string | string[], options?: CreateOptions): Promise<number[][]>
  getModel(): string
  getDimensions(): number
}

export interface EmbeddingsClientConfig {
  supabaseClient: SupabaseClient
  provider: EmbeddingProvider
  defaultTable?: string
  defaultChunkSize?: number
  defaultThreshold?: number
}