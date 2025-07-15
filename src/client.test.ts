import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupabaseAI } from './client'
import { ConfigurationError } from './types/errors'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseAIOptions } from './types'

// Mock the EmbeddingsClient to avoid external dependencies
vi.mock('./embeddings', () => ({
  EmbeddingsClient: vi.fn().mockImplementation(() => ({
    // Mock methods that might be called
    store: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
    similarity: vi.fn()
  }))
}))

// Mock the OpenAI provider
vi.mock('./embeddings/providers', () => ({
  OpenAIProvider: vi.fn().mockImplementation(() => ({
    createEmbedding: vi.fn(),
    getModel: vi.fn().mockReturnValue('text-embedding-3-small'),
    getDimensions: vi.fn().mockReturnValue(1536)
  }))
}))

describe('SupabaseAI', () => {
  let mockSupabaseClient: SupabaseClient
  let validOptions: SupabaseAIOptions

  beforeEach(() => {
    // Create a mock Supabase client
    mockSupabaseClient = {} as SupabaseClient
    
    // Default valid options
    validOptions = {
      apiKey: 'test-api-key'
    }
  })

  describe('constructor', () => {
    it('should create instance with default embeddings config', () => {
      const ai = new SupabaseAI(mockSupabaseClient, validOptions)
      
      expect(ai).toBeInstanceOf(SupabaseAI)
      expect(ai.embeddings).toBeDefined()
    })

    it('should create instance with custom embeddings config', () => {
      const customOptions: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          provider: 'openai',
          model: 'text-embedding-3-large',
          table: 'custom_documents',
          threshold: 0.9
        }
      }

      const ai = new SupabaseAI(mockSupabaseClient, customOptions)
      
      expect(ai).toBeInstanceOf(SupabaseAI)
      expect(ai.getModel()).toBe('text-embedding-3-large')
      expect(ai.getEmbeddingsConfig().table).toBe('custom_documents')
      expect(ai.getEmbeddingsConfig().threshold).toBe(0.9)
    })

    it('should throw ConfigurationError when apiKey is missing', () => {
      const invalidOptions = {} as SupabaseAIOptions

      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow(ConfigurationError)
      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow('API key is required')
    })

    it('should throw ConfigurationError when apiKey is empty', () => {
      const invalidOptions: SupabaseAIOptions = {
        apiKey: ''
      }

      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow(ConfigurationError)
      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow('API key is required')
    })

    it('should throw ConfigurationError when threshold is below 0', () => {
      const invalidOptions: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          threshold: -0.1
        }
      }

      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow(ConfigurationError)
      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow('threshold must be between 0 and 1')
    })

    it('should throw ConfigurationError when threshold is above 1', () => {
      const invalidOptions: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          threshold: 1.1
        }
      }

      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow(ConfigurationError)
      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow('threshold must be between 0 and 1')
    })

    it('should throw ConfigurationError when table is empty', () => {
      const invalidOptions: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          table: ''
        }
      }

      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow(ConfigurationError)
      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow('table cannot be empty')
    })

    it('should throw ConfigurationError when table is only whitespace', () => {
      const invalidOptions: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          table: '   '
        }
      }

      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow(ConfigurationError)
      expect(() => {
        new SupabaseAI(mockSupabaseClient, invalidOptions)
      }).toThrow('table cannot be empty')
    })
  })

  describe('getProvider', () => {
    it('should return default provider when not specified', () => {
      const ai = new SupabaseAI(mockSupabaseClient, validOptions)
      
      expect(ai.getProvider()).toBe('openai')
    })

    it('should return specified provider', () => {
      const optionsWithProvider: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          provider: 'openai'
        }
      }

      const ai = new SupabaseAI(mockSupabaseClient, optionsWithProvider)
      
      expect(ai.getProvider()).toBe('openai')
    })
  })

  describe('getModel', () => {
    it('should return default model when not specified', () => {
      const ai = new SupabaseAI(mockSupabaseClient, validOptions)
      
      expect(ai.getModel()).toBe('text-embedding-3-small')
    })

    it('should return specified model', () => {
      const optionsWithModel: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          model: 'text-embedding-3-large'
        }
      }

      const ai = new SupabaseAI(mockSupabaseClient, optionsWithModel)
      
      expect(ai.getModel()).toBe('text-embedding-3-large')
    })
  })

  describe('getEmbeddingsConfig', () => {
    it('should return complete config with defaults', () => {
      const ai = new SupabaseAI(mockSupabaseClient, validOptions)
      const config = ai.getEmbeddingsConfig()
      
      expect(config).toEqual({
        provider: 'openai',
        model: 'text-embedding-3-small',
        table: 'documents',
        threshold: 0.8
      })
    })

    it('should return complete config with custom values', () => {
      const customOptions: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          provider: 'openai',
          model: 'text-embedding-3-large',
          table: 'custom_docs',
          threshold: 0.9
        }
      }

      const ai = new SupabaseAI(mockSupabaseClient, customOptions)
      const config = ai.getEmbeddingsConfig()
      
      expect(config).toEqual({
        provider: 'openai',
        model: 'text-embedding-3-large',
        table: 'custom_docs',
        threshold: 0.9
      })
    })

    it('should return a copy of the config (not reference)', () => {
      const ai = new SupabaseAI(mockSupabaseClient, validOptions)
      const config1 = ai.getEmbeddingsConfig()
      const config2 = ai.getEmbeddingsConfig()
      
      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe('getSupabaseClient', () => {
    it('should return the Supabase client instance', () => {
      const ai = new SupabaseAI(mockSupabaseClient, validOptions)
      
      expect(ai.getSupabaseClient()).toBe(mockSupabaseClient)
    })
  })

  describe('nullish coalescing behavior', () => {
    it('should use defaults when embeddings config is undefined', () => {
      const options: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: undefined
      }

      const ai = new SupabaseAI(mockSupabaseClient, options)
      const config = ai.getEmbeddingsConfig()
      
      expect(config.provider).toBe('openai')
      expect(config.model).toBe('text-embedding-3-small')
      expect(config.table).toBe('documents')
      expect(config.threshold).toBe(0.8)
    })

    it('should use defaults when embeddings properties are undefined', () => {
      const options: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          provider: undefined,
          model: undefined,
          table: undefined,
          threshold: undefined
        }
      }

      const ai = new SupabaseAI(mockSupabaseClient, options)
      const config = ai.getEmbeddingsConfig()
      
      expect(config.provider).toBe('openai')
      expect(config.model).toBe('text-embedding-3-small')
      expect(config.table).toBe('documents')
      expect(config.threshold).toBe(0.8)
    })

    it('should use defaults when embeddings properties are null', () => {
      const options: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          provider: null as any,
          model: null as any,
          table: null as any,
          threshold: null as any
        }
      }

      const ai = new SupabaseAI(mockSupabaseClient, options)
      const config = ai.getEmbeddingsConfig()
      
      expect(config.provider).toBe('openai')
      expect(config.model).toBe('text-embedding-3-small')
      expect(config.table).toBe('documents')
      expect(config.threshold).toBe(0.8)
    })

    it('should NOT use defaults when embeddings properties are empty strings', () => {
      const options: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          model: '',
          table: ''
        }
      }

      // This should fail validation due to empty table
      expect(() => {
        new SupabaseAI(mockSupabaseClient, options)
      }).toThrow(ConfigurationError)
    })

    it('should NOT use defaults when threshold is 0', () => {
      const options: SupabaseAIOptions = {
        apiKey: 'test-api-key',
        embeddings: {
          threshold: 0
        }
      }

      const ai = new SupabaseAI(mockSupabaseClient, options)
      const config = ai.getEmbeddingsConfig()
      
      expect(config.threshold).toBe(0)
    })
  })
})