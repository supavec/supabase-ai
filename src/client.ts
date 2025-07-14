import { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseAIOptions, EmbeddingProvider, EmbeddingsConfig } from "./types";
import { ConfigurationError } from "./types/errors";
import { EmbeddingsClient } from "./embeddings";
import { OpenAIProvider } from "./embeddings/providers";

export class SupabaseAI {
  public embeddings: EmbeddingsClient;
  private supabaseClient: SupabaseClient;
  private options: SupabaseAIOptions;
  private embeddingsConfig: Required<EmbeddingsConfig>;

  constructor(supabaseClient: SupabaseClient, options: SupabaseAIOptions) {
    this.supabaseClient = supabaseClient;
    this.options = options;

    // Set up embeddings config with defaults
    this.embeddingsConfig = {
      model: options.embeddings?.model || 'text-embedding-3-small',
      table: options.embeddings?.table || 'documents',
      chunkSize: options.embeddings?.chunkSize || 1000,
      threshold: options.embeddings?.threshold || 0.8,
    };

    this.validateOptions();

    const provider = this.createProvider();

    this.embeddings = new EmbeddingsClient({
      supabaseClient,
      provider,
      table: this.embeddingsConfig.table,
      chunkSize: this.embeddingsConfig.chunkSize,
      threshold: this.embeddingsConfig.threshold,
    });
  }

  private validateOptions(): void {
    if (!this.options.apiKey) {
      throw new ConfigurationError("API key is required");
    }

    // Validate embeddings config values
    if (this.embeddingsConfig.chunkSize <= 0) {
      throw new ConfigurationError("chunkSize must be greater than 0");
    }

    if (this.embeddingsConfig.threshold < 0 || this.embeddingsConfig.threshold > 1) {
      throw new ConfigurationError("threshold must be between 0 and 1");
    }

    if (!this.embeddingsConfig.table.trim()) {
      throw new ConfigurationError("table cannot be empty");
    }
  }

  private createProvider(): EmbeddingProvider {
    return new OpenAIProvider(this.options.apiKey, this.embeddingsConfig.model);
  }


  getProvider(): string {
    return "openai";
  }

  getModel(): string {
    return this.embeddingsConfig.model;
  }

  getEmbeddingsConfig(): Required<EmbeddingsConfig> {
    return { ...this.embeddingsConfig };
  }

  getSupabaseClient(): SupabaseClient {
    return this.supabaseClient;
  }
}
