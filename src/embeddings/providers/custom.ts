import type { EmbeddingProvider, CreateOptions } from '../../types'

export class CustomProvider implements EmbeddingProvider {
  private embedFn: (input: string | string[], options?: CreateOptions) => Promise<number[][]>
  private model: string
  private dimensions: number

  constructor(
    embedFn: (input: string | string[], options?: CreateOptions) => Promise<number[][]>,
    model: string,
    dimensions: number
  ) {
    this.embedFn = embedFn
    this.model = model
    this.dimensions = dimensions
  }

  async createEmbedding(input: string | string[], options?: CreateOptions): Promise<number[][]> {
    return this.embedFn(input, options)
  }

  getModel(): string {
    return this.model
  }

  getDimensions(): number {
    return this.dimensions
  }
}