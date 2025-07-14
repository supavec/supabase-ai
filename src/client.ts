import { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseAIOptions, EmbeddingProvider } from "./types";
import { ConfigurationError } from "./types/errors";
import { EmbeddingsClient } from "./embeddings";
import { OpenAIProvider } from "./embeddings/providers";

export class SupabaseAI {
  public embeddings: EmbeddingsClient;
  private supabaseClient: SupabaseClient;
  private options: SupabaseAIOptions;

  constructor(supabaseClient: SupabaseClient, options: SupabaseAIOptions) {
    this.supabaseClient = supabaseClient;
    this.options = options;

    this.validateOptions();

    const provider = this.createProvider();

    this.embeddings = new EmbeddingsClient({
      supabaseClient,
      provider,
      ...(options.defaultTable && { defaultTable: options.defaultTable }),
      ...(options.defaultChunkSize && {
        defaultChunkSize: options.defaultChunkSize,
      }),
      ...(options.defaultThreshold && {
        defaultThreshold: options.defaultThreshold,
      }),
    });
  }

  private validateOptions(): void {
    if (!this.options.apiKey) {
      throw new ConfigurationError("API key is required");
    }
  }

  private createProvider(): EmbeddingProvider {
    return new OpenAIProvider(this.options.apiKey, this.options.model);
  }


  getProvider(): string {
    return "openai";
  }

  getModel(): string {
    return this.options.model || "default";
  }

  getSupabaseClient(): SupabaseClient {
    return this.supabaseClient;
  }
}
