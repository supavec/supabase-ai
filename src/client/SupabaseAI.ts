import { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseAIOptions, EmbeddingProvider } from '../types'
import { ConfigurationError } from '../types/errors'
import { EmbeddingsClient } from '../embeddings'
import { OpenAIProvider, CustomProvider } from '../embeddings/providers'

export class SupabaseAI {
  public embeddings: EmbeddingsClient
  private supabaseClient: SupabaseClient
  private options: SupabaseAIOptions

  constructor(supabaseClient: SupabaseClient, options: SupabaseAIOptions) {
    this.supabaseClient = supabaseClient
    this.options = options

    this.validateOptions()
    
    const provider = this.createProvider()
    
    this.embeddings = new EmbeddingsClient({
      supabaseClient,
      provider,
      defaultTable: options.defaultTable,
      defaultChunkSize: options.defaultChunkSize,
      defaultThreshold: options.defaultThreshold
    })
  }

  private validateOptions(): void {
    if (!this.options.provider) {
      throw new ConfigurationError('Provider is required')
    }

    if (!this.options.apiKey && this.options.provider !== 'custom') {
      throw new ConfigurationError('API key is required for non-custom providers')
    }
  }

  private createProvider(): EmbeddingProvider {
    switch (this.options.provider) {
      case 'openai':
        return new OpenAIProvider(
          this.options.apiKey,
          this.options.model
        )
      
      case 'custom':
        throw new ConfigurationError(
          'Custom provider requires createCustomProvider() method'
        )
      
      case 'anthropic':
        throw new ConfigurationError(
          'Anthropic provider not yet implemented'
        )
      
      default:
        throw new ConfigurationError(
          `Unknown provider: ${this.options.provider}`
        )
    }
  }

  static createWithCustomProvider(
    supabaseClient: SupabaseClient,
    embedFn: (input: string | string[]) => Promise<number[][]>,
    model: string,
    dimensions: number,
    options: Partial<SupabaseAIOptions> = {}
  ): SupabaseAI {
    const customProvider = new CustomProvider(embedFn, model, dimensions)
    
    const instance = Object.create(SupabaseAI.prototype)
    instance.supabaseClient = supabaseClient
    instance.options = { ...options, provider: 'custom', apiKey: '' }
    
    instance.embeddings = new EmbeddingsClient({
      supabaseClient,
      provider: customProvider,
      defaultTable: options.defaultTable,
      defaultChunkSize: options.defaultChunkSize,
      defaultThreshold: options.defaultThreshold
    })
    
    return instance
  }

  getProvider(): string {
    return this.options.provider
  }

  getModel(): string {
    return this.options.model || 'default'
  }
}