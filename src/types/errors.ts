export class SupabaseAIError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'SupabaseAIError'
  }
}

export class EmbeddingProviderError extends SupabaseAIError {
  constructor(message: string, public provider: string) {
    super(message, 'EMBEDDING_PROVIDER_ERROR')
    this.name = 'EmbeddingProviderError'
  }
}

export class DatabaseError extends SupabaseAIError {
  constructor(message: string, public originalError?: any) {
    super(message, 'DATABASE_ERROR')
    this.name = 'DatabaseError'
  }
}

export class ValidationError extends SupabaseAIError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class ConfigurationError extends SupabaseAIError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR')
    this.name = 'ConfigurationError'
  }
}