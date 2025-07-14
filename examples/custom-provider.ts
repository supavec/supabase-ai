import { createClient } from '@supabase/supabase-js'
import { SupabaseAI } from '@supavec/supabase-ai'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Example custom embedding function
async function customEmbeddingFunction(input: string | string[]): Promise<number[][]> {
  // This is a mock implementation - replace with your actual embedding logic
  // For example, you might call a different API or use a local model
  
  const inputs = Array.isArray(input) ? input : [input]
  const embeddings: number[][] = []
  
  for (const text of inputs) {
    // Generate a mock embedding (in practice, this would call your embedding service)
    const embedding = new Array(1536).fill(0).map(() => Math.random() - 0.5)
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    const normalized = embedding.map(val => val / magnitude)
    
    embeddings.push(normalized)
  }
  
  return embeddings
}

// Alternative: Using a hypothetical local model
async function localModelEmbedding(input: string | string[]): Promise<number[][]> {
  // Example using a hypothetical local embedding model
  // This could be HuggingFace transformers, sentence-transformers, etc.
  
  const inputs = Array.isArray(input) ? input : [input]
  const embeddings: number[][] = []
  
  for (const text of inputs) {
    // Simulate calling a local model
    console.log(`Generating embedding for: ${text.substring(0, 50)}...`)
    
    // Your local model call would go here
    const embedding = await generateLocalEmbedding(text)
    embeddings.push(embedding)
  }
  
  return embeddings
}

async function generateLocalEmbedding(text: string): Promise<number[]> {
  // Mock local embedding generation
  // In practice, this would use your local model
  return new Array(768).fill(0).map(() => Math.random() - 0.5)
}

async function customProviderExample() {
  try {
    // Create SupabaseAI with custom provider
    const customAI = SupabaseAI.createWithCustomProvider(
      supabase,
      customEmbeddingFunction,
      'custom-model-v1',
      1536, // embedding dimensions
      {
        defaultTable: 'documents',
        defaultThreshold: 0.8
      }
    )

    console.log('Using custom embedding provider...')
    console.log(`Model: ${customAI.getModel()}`)
    console.log(`Provider: ${customAI.getProvider()}`)

    // Store documents using custom embeddings
    await customAI.embeddings.store([
      {
        content: 'This document uses custom embeddings for semantic search.',
        metadata: { source: 'custom-provider-example' }
      },
      {
        content: 'Custom embedding providers allow you to use any embedding model.',
        metadata: { source: 'custom-provider-example' }
      }
    ], {
      table: 'documents'
    })

    console.log('Documents stored with custom embeddings!')

    // Search using custom embeddings
    const results = await customAI.embeddings.search('custom embedding search', {
      table: 'documents',
      limit: 5,
      threshold: 0.5,
      metadata: { source: 'custom-provider-example' },
      includeDistance: true
    })

    console.log('Search results using custom provider:')
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.content}`)
      console.log(`   Similarity: ${result.similarity?.toFixed(3)}`)
      console.log()
    })

    // Example with local model provider
    console.log('Creating local model provider...')
    const localAI = SupabaseAI.createWithCustomProvider(
      supabase,
      localModelEmbedding,
      'local-sentence-transformer',
      768, // Different dimensions for local model
      {
        defaultTable: 'documents',
        defaultThreshold: 0.7
      }
    )

    // Generate embeddings directly
    const directEmbeddings = await localAI.embeddings.create([
      'Hello world',
      'How are you?'
    ])

    console.log(`Generated ${directEmbeddings.length} embeddings with ${directEmbeddings[0].length} dimensions`)

  } catch (error) {
    console.error('Error:', error)
  }
}

customProviderExample()