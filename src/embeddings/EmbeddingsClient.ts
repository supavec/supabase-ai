import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EmbeddingsClientConfig,
  CreateOptions,
  StoreData,
  StoreInput,
  StoreOptions,
  SearchOptions,
  SearchResult,
  EmbeddingProvider,
} from "../types";
import { DatabaseError, ValidationError } from "../types/errors";
import { generateId, cosineSimilarity } from "./utils";

export class EmbeddingsClient {
  private supabase: SupabaseClient;
  private provider: EmbeddingProvider;
  private defaultTable: string;
  private defaultThreshold: number;

  constructor(config: EmbeddingsClientConfig) {
    this.supabase = config.supabaseClient;
    this.provider = config.provider;
    this.defaultTable = config.table ?? "documents";
    this.defaultThreshold = config.threshold ?? 0.8;
  }

  private normalizeStoreInput(item: StoreInput): StoreData {
    // Check if it's a LangChain Document (has pageContent)
    if ('pageContent' in item) {
      return {
        content: item.pageContent,
        ...(item.metadata && { metadata: item.metadata }),
        ...(item.id && { id: item.id }),
      };
    }
    // Already in StoreData format
    return item as StoreData;
  }

  async create(
    input: string | string[],
    options?: CreateOptions
  ): Promise<number[][]> {
    return this.provider.createEmbedding(input, options);
  }

  async store(data: StoreInput[], options?: StoreOptions): Promise<void> {
    const table = options?.table ?? this.defaultTable;

    if (!table) {
      throw new ValidationError(
        "Table name is required. Provide either options.table or set defaultTable in constructor."
      );
    }

    const batchSize = options?.batchSize ?? 100;
    const generateIds = options?.generateId === true;

    const processedData: any[] = [];

    for (const item of data) {
      // Normalize LangChain Document to StoreData format
      const normalizedItem = this.normalizeStoreInput(item);
      
      const embeddings = await this.create(normalizedItem.content);

      const record: any = {
        content: normalizedItem.content,
        embedding: embeddings[0],
        metadata: normalizedItem.metadata ?? {},
        ...Object.fromEntries(
          Object.entries(normalizedItem).filter(
            ([key]) => !["content", "metadata", "id"].includes(key)
          )
        ),
      };

      // Only include id field if explicitly provided or generateIds is enabled
      if (normalizedItem.id) {
        record.id = normalizedItem.id;
      } else if (generateIds) {
        record.id = generateId();
      }

      processedData.push(record);
    }

    for (let i = 0; i < processedData.length; i += batchSize) {
      const batch = processedData.slice(i, i + batchSize);

      const { error } = await this.supabase.from(table).insert(batch);

      if (error) {
        throw new DatabaseError(
          `Failed to store embeddings: ${error.message}`,
          error
        );
      }
    }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const table = options?.table ?? this.defaultTable;

    if (!table) {
      throw new ValidationError(
        "Table name is required. Provide either options.table or set defaultTable in constructor."
      );
    }

    const queryEmbedding = await this.create(query);
    const threshold = options?.threshold ?? this.defaultThreshold;
    const limit = options?.limit ?? 10;
    const rpcFunction = options?.rpc ?? "match_documents";

    const rpcParams: any = {
      query_embedding: queryEmbedding[0],
      match_threshold: threshold,
      match_count: limit,
      table_name: table,
    };

    if (options?.filters) {
      rpcParams.filters = options.filters;
    }

    if (options?.metadata) {
      rpcParams.metadata_filter = options.metadata;
    }

    try {
      const { data, error } = await this.supabase.rpc(rpcFunction, rpcParams);

      if (error) {
        throw new DatabaseError(`Search failed: ${error.message}`, error);
      }

      let results = data ?? [];

      if (options?.select) {
        const selectFields = options.select.split(",").map((f) => f.trim());
        results = results.map((item: any) => {
          const filtered: any = {};
          selectFields.forEach((field) => {
            if (item[field] !== undefined) {
              filtered[field] = item[field];
            }
          });
          return filtered;
        });
      }

      if (options?.orderBy && options.orderBy !== "similarity") {
        results.sort((a: any, b: any) => {
          const aVal = a[options.orderBy!];
          const bVal = b[options.orderBy!];
          return aVal > bVal ? 1 : -1;
        });
      }

      if (options?.includeDistance) {
        results = results.map((item: any) => ({
          ...item,
          similarity: item.similarity ?? 0,
        }));
      }

      return results;
    } catch (error: any) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Search operation failed: ${error.message}`,
        error
      );
    }
  }

  async similarity(text1: string, text2: string): Promise<number> {
    const embeddings = await this.create([text1, text2]);
    return cosineSimilarity(embeddings[0], embeddings[1]);
  }

  async cosineSimilarity(
    vector1: number[],
    vector2: number[]
  ): Promise<number> {
    return cosineSimilarity(vector1, vector2);
  }
}
