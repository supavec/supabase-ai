import { createClient } from "@supabase/supabase-js";
import { SupabaseAI } from "@supavec/supabase-ai";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Initialize SupabaseAI with OpenAI
const ai = new SupabaseAI(supabase, {
  apiKey: process.env.OPENAI_API_KEY!,
  model: "text-embedding-3-small",
  defaultTable: "documents",
  defaultThreshold: 0.8,
});

async function basicExample() {
  try {
    // Store some documents
    console.log("Storing documents...");
    await ai.embeddings.store(
      [
        {
          content:
            "Artificial intelligence is transforming the way we work and live.",
          metadata: { title: "AI Overview", category: "technology" },
        },
        {
          content:
            "Machine learning algorithms can identify patterns in large datasets.",
          metadata: { title: "ML Patterns", category: "technology" },
        },
        {
          content: "The weather today is sunny with a high of 75 degrees.",
          metadata: { title: "Weather Report", category: "weather" },
        },
      ],
      {
        table: "documents",
      }
    );

    console.log("Documents stored successfully!");

    // Search for documents
    console.log("Searching for AI-related content...");
    const results = await ai.embeddings.search(
      "artificial intelligence machine learning",
      {
        table: "documents",
        limit: 5,
        threshold: 0.7,
        includeDistance: true,
      }
    );

    console.log("Search results:");
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.content}`);
      console.log(`   Similarity: ${result.similarity?.toFixed(3)}`);
      console.log(`   Metadata: ${JSON.stringify(result.metadata)}`);
      console.log();
    });

    // Calculate similarity between two texts
    const similarity = await ai.embeddings.similarity(
      "artificial intelligence",
      "machine learning"
    );
    console.log(
      `Similarity between "artificial intelligence" and "machine learning": ${similarity.toFixed(
        3
      )}`
    );
  } catch (error) {
    console.error("Error:", error);
  }
}

basicExample();
