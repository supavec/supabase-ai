import OpenAI from 'openai'
import type { EmbeddingProvider, CreateOptions } from '../../types'
import { EmbeddingProviderError } from '../../types/errors'

export class OpenAIProvider implements EmbeddingProvider {
  private client: OpenAI
  private model: string
  private dimensions: number

  constructor(apiKey: string, model: string = 'text-embedding-3-small') {
    this.client = new OpenAI({ apiKey })
    this.model = model
    this.dimensions = model === 'text-embedding-3-large' ? 3072 : 1536
  }

  async createEmbedding(input: string | string[], options?: CreateOptions): Promise<number[][]> {
    try {
      const model = options?.model ?? this.model
      const inputArray = Array.isArray(input) ? input : [input]

      const response = await this.client.embeddings.create({
        model,
        input: inputArray,
        dimensions: options?.dimensions ?? this.dimensions
      })

      return response.data.map(embedding => embedding.embedding)
    } catch (error: any) {
      throw new EmbeddingProviderError(
        `OpenAI embedding error: ${error.message}`,
        'openai'
      )
    }
  }

  getModel(): string {
    return this.model
  }

  getDimensions(): number {
    return this.dimensions
  }
}