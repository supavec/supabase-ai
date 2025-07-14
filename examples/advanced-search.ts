import { createClient } from '@supabase/supabase-js'
import { SupabaseAI } from '@supavec/supabase-ai'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

const ai = new SupabaseAI(supabase, {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-small'
})

async function advancedSearchExample() {
  try {
    // Store documents with rich metadata
    console.log('Storing documents with metadata...')
    await ai.embeddings.store([
      {
        content: 'React is a JavaScript library for building user interfaces.',
        metadata: { 
          title: 'React Basics',
          category: 'programming',
          tags: ['react', 'javascript', 'frontend'],
          difficulty: 'beginner',
          author: 'John Doe'
        },
        user_id: 'user123'
      },
      {
        content: 'TypeScript adds static typing to JavaScript for better development experience.',
        metadata: { 
          title: 'TypeScript Guide',
          category: 'programming',
          tags: ['typescript', 'javascript'],
          difficulty: 'intermediate',
          author: 'Jane Smith'
        },
        user_id: 'user123'
      },
      {
        content: 'The best chocolate chip cookie recipe uses brown butter.',
        metadata: { 
          title: 'Cookie Recipe',
          category: 'cooking',
          tags: ['baking', 'dessert'],
          difficulty: 'easy',
          author: 'Chef Mike'
        },
        user_id: 'user456'
      }
    ], {
      table: 'documents',
      chunkSize: 500
    })

    // Advanced search with filters
    console.log('Searching with filters...')
    const programmingResults = await ai.embeddings.search('JavaScript development', {
      table: 'documents',
      limit: 10,
      threshold: 0.6,
      filters: {
        user_id: 'user123'
      },
      metadata: {
        category: 'programming'
      },
      select: 'id, content, metadata, created_at',
      orderBy: 'similarity',
      includeDistance: true
    })

    console.log('Programming-related results:')
    programmingResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.metadata?.title}`)
      console.log(`   Content: ${result.content}`)
      console.log(`   Similarity: ${result.similarity?.toFixed(3)}`)
      console.log(`   Tags: ${result.metadata?.tags?.join(', ')}`)
      console.log(`   Author: ${result.metadata?.author}`)
      console.log()
    })

    // Search with complex filters
    console.log('Searching with complex filters...')
    const complexResults = await ai.embeddings.search('cooking recipe', {
      table: 'documents',
      limit: 5,
      threshold: 0.5,
      filters: {
        created_at: { gte: '2024-01-01' }
      },
      metadata: {
        difficulty: 'easy'
      },
      includeDistance: true
    })

    console.log('Easy cooking results:')
    complexResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.metadata?.title}`)
      console.log(`   Difficulty: ${result.metadata?.difficulty}`)
      console.log(`   Similarity: ${result.similarity?.toFixed(3)}`)
      console.log()
    })

    // Search with custom ordering
    console.log('Searching with custom ordering...')
    const orderedResults = await ai.embeddings.search('programming', {
      table: 'documents',
      limit: 5,
      threshold: 0.5,
      orderBy: 'created_at',
      includeDistance: true
    })

    console.log('Results ordered by creation date:')
    orderedResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.metadata?.title}`)
      console.log(`   Created: ${result.created_at}`)
      console.log(`   Similarity: ${result.similarity?.toFixed(3)}`)
      console.log()
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

advancedSearchExample()