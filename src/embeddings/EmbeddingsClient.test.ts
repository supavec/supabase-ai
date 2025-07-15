import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbeddingsClient } from "./EmbeddingsClient";
import { DatabaseError, ValidationError } from "../types/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EmbeddingProvider,
  EmbeddingsClientConfig,
  StoreData,
  LangChainDocument,
} from "../types";

// Mock the utils
vi.mock("./utils", () => ({
  generateId: vi.fn().mockReturnValue("mock-uuid-123"),
  cosineSimilarity: vi.fn().mockReturnValue(0.95),
}));

describe("EmbeddingsClient", () => {
  let mockSupabaseClient: SupabaseClient;
  let mockProvider: EmbeddingProvider;
  let client: EmbeddingsClient;
  let defaultConfig: EmbeddingsClientConfig;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [
          { id: "1", content: "test content", metadata: {}, similarity: 0.9 },
        ],
        error: null,
      }),
    } as any;

    // Mock embedding provider
    mockProvider = {
      createEmbedding: vi.fn().mockResolvedValue([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]),
      getModel: vi.fn().mockReturnValue("text-embedding-3-small"),
      getDimensions: vi.fn().mockReturnValue(1536),
    };

    defaultConfig = {
      supabaseClient: mockSupabaseClient,
      provider: mockProvider,
      table: "test_documents",
      threshold: 0.8,
    };

    client = new EmbeddingsClient(defaultConfig);
  });

  describe("constructor", () => {
    it("should create client with provided config", () => {
      expect(client).toBeInstanceOf(EmbeddingsClient);
    });

    it("should use defaults when table and threshold are not provided", () => {
      const minimalConfig = {
        supabaseClient: mockSupabaseClient,
        provider: mockProvider,
      };
      const minimalClient = new EmbeddingsClient(minimalConfig);
      expect(minimalClient).toBeInstanceOf(EmbeddingsClient);
    });

    it("should use nullish coalescing for defaults", () => {
      const configWithNulls = {
        supabaseClient: mockSupabaseClient,
        provider: mockProvider,
        table: null as any,
        threshold: null as any,
      };
      const clientWithNulls = new EmbeddingsClient(configWithNulls);
      expect(clientWithNulls).toBeInstanceOf(EmbeddingsClient);
    });
  });

  describe("create", () => {
    it("should create embeddings for single string", async () => {
      const result = await client.create("test text");

      expect(mockProvider.createEmbedding).toHaveBeenCalledWith(
        "test text",
        undefined
      );
      expect(result).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]);
    });

    it("should create embeddings for array of strings", async () => {
      const result = await client.create(["text1", "text2"]);

      expect(mockProvider.createEmbedding).toHaveBeenCalledWith(
        ["text1", "text2"],
        undefined
      );
      expect(result).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]);
    });

    it("should pass options to provider", async () => {
      const options = { model: "custom-model", dimensions: 512 };
      await client.create("test", options);

      expect(mockProvider.createEmbedding).toHaveBeenCalledWith(
        "test",
        options
      );
    });
  });

  describe("normalizeStoreInput", () => {
    it("should normalize LangChain Document to StoreData", async () => {
      const langchainDoc: LangChainDocument = {
        pageContent: "test content",
        metadata: { source: "test" },
        id: "doc-1",
      };

      await client.store([langchainDoc]);

      expect(mockProvider.createEmbedding).toHaveBeenCalledWith(
        "test content",
        undefined
      );
    });

    it("should handle LangChain Document without metadata", async () => {
      const langchainDoc: LangChainDocument = {
        pageContent: "test content",
      };

      await client.store([langchainDoc]);

      expect(mockProvider.createEmbedding).toHaveBeenCalledWith(
        "test content",
        undefined
      );
    });

    it("should handle native StoreData format", async () => {
      const storeData: StoreData = {
        content: "test content",
        metadata: { type: "test" },
      };

      await client.store([storeData]);

      expect(mockProvider.createEmbedding).toHaveBeenCalledWith(
        "test content",
        undefined
      );
    });
  });

  describe("store", () => {
    it("should store documents with default table", async () => {
      const data: StoreData[] = [
        { content: "test content 1", metadata: { type: "test" } },
        { content: "test content 2", metadata: { type: "test" } },
      ];

      await client.store(data);

      expect(mockProvider.createEmbedding).toHaveBeenCalledTimes(2);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("test_documents");
    });

    it("should store documents with custom table", async () => {
      const data: StoreData[] = [
        { content: "test content", metadata: { type: "test" } },
      ];

      await client.store(data, { table: "custom_table" });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("custom_table");
    });

    it("should throw ValidationError when no table is provided and defaultTable is empty", async () => {
      const clientWithoutTable = new EmbeddingsClient({
        supabaseClient: mockSupabaseClient,
        provider: mockProvider,
        table: "", // Empty string should trigger validation error
      });

      const data: StoreData[] = [{ content: "test" }];

      await expect(clientWithoutTable.store(data)).rejects.toThrow(
        ValidationError
      );
      await expect(clientWithoutTable.store(data)).rejects.toThrow(
        "Table name is required"
      );
    });

    it("should handle generateId option", async () => {
      const data: StoreData[] = [
        { content: "test content", metadata: { type: "test" } },
      ];

      await client.store(data, { generateId: true });

      const insertCall = (mockSupabaseClient.from as any).mock.results[0].value
        .insert;
      expect(insertCall).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "mock-uuid-123",
        }),
      ]);
    });

    it("should preserve existing IDs when provided", async () => {
      const data: StoreData[] = [
        {
          content: "test content",
          metadata: { type: "test" },
          id: "existing-id",
        },
      ];

      await client.store(data);

      const insertCall = (mockSupabaseClient.from as any).mock.results[0].value
        .insert;
      expect(insertCall).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "existing-id",
        }),
      ]);
    });

    it("should handle batch processing", async () => {
      const data: StoreData[] = Array.from({ length: 250 }, (_, i) => ({
        content: `test content ${i}`,
        metadata: { index: i },
      }));

      await client.store(data, { batchSize: 100 });

      // Should make 3 insert calls (100, 100, 50)
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(3);
    });

    it("should handle additional fields in StoreData", async () => {
      const data: StoreData[] = [
        {
          content: "test content",
          metadata: { type: "test" },
          user_id: "user123",
          category: "tech",
        },
      ];

      await client.store(data);

      const insertCall = (mockSupabaseClient.from as any).mock.results[0].value
        .insert;
      expect(insertCall).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: "user123",
          category: "tech",
        }),
      ]);
    });

    it("should throw DatabaseError when insert fails", async () => {
      const mockError = { message: "Database connection failed" };
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: mockError }),
      });

      const data: StoreData[] = [{ content: "test" }];

      await expect(client.store(data)).rejects.toThrow(DatabaseError);
      await expect(client.store(data)).rejects.toThrow(
        "Failed to store embeddings"
      );
    });

    it("should handle mixed LangChain and native formats", async () => {
      const data = [
        { pageContent: "langchain content", metadata: { type: "langchain" } },
        { content: "native content", metadata: { type: "native" } },
      ];

      await client.store(data);

      expect(mockProvider.createEmbedding).toHaveBeenCalledWith(
        "langchain content",
        undefined
      );
      expect(mockProvider.createEmbedding).toHaveBeenCalledWith(
        "native content",
        undefined
      );
    });
  });

  describe("search", () => {
    it("should search with default parameters", async () => {
      const results = await client.search("test query");

      expect(mockProvider.createEmbedding).toHaveBeenCalledWith(
        "test query",
        undefined
      );
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("match_documents", {
        query_embedding: [0.1, 0.2, 0.3],
        match_threshold: 0.8,
        match_count: 10,
        table_name: "test_documents",
      });
      expect(results).toEqual([
        { id: "1", content: "test content", metadata: {}, similarity: 0.9 },
      ]);
    });

    it("should search with custom parameters", async () => {
      const options = {
        table: "custom_table",
        threshold: 0.9,
        limit: 5,
        rpc: "custom_match",
      };

      await client.search("test query", options);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("custom_match", {
        query_embedding: [0.1, 0.2, 0.3],
        match_threshold: 0.9,
        match_count: 5,
        table_name: "custom_table",
      });
    });

    it("should include filters and metadata in RPC call", async () => {
      const options = {
        filters: { user_id: "user123" },
        metadata: { category: "tech" },
      };

      await client.search("test query", options);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "match_documents",
        expect.objectContaining({
          filters: { user_id: "user123" },
          metadata_filter: { category: "tech" },
        })
      );
    });

    it("should handle select option", async () => {
      const options = { select: "id, content, metadata" };
      const mockData = [
        {
          id: "1",
          content: "test",
          metadata: {},
          similarity: 0.9,
          extra: "field",
        },
      ];

      mockSupabaseClient.rpc = vi
        .fn()
        .mockResolvedValue({ data: mockData, error: null });

      const results = await client.search("test query", options);

      expect(results).toEqual([{ id: "1", content: "test", metadata: {} }]);
    });

    it("should handle orderBy option", async () => {
      const options = { orderBy: "created_at" as const };
      const mockData = [
        { id: "2", created_at: "2023-02-01" },
        { id: "1", created_at: "2023-01-01" },
      ];

      mockSupabaseClient.rpc = vi
        .fn()
        .mockResolvedValue({ data: mockData, error: null });

      const results = await client.search("test query", options);

      expect(results[0].id).toBe("1");
      expect(results[1].id).toBe("2");
    });

    it("should handle includeDistance option", async () => {
      const options = { includeDistance: true };
      const mockData = [{ id: "1", content: "test" }];

      mockSupabaseClient.rpc = vi
        .fn()
        .mockResolvedValue({ data: mockData, error: null });

      const results = await client.search("test query", options);

      expect(results).toEqual([{ id: "1", content: "test", similarity: 0 }]);
    });

    it("should throw ValidationError when no table is provided and defaultTable is empty", async () => {
      const clientWithoutTable = new EmbeddingsClient({
        supabaseClient: mockSupabaseClient,
        provider: mockProvider,
        table: "", // Empty string should trigger validation error
      });

      await expect(clientWithoutTable.search("test query")).rejects.toThrow(
        ValidationError
      );
      await expect(clientWithoutTable.search("test query")).rejects.toThrow(
        "Table name is required"
      );
    });

    it("should throw DatabaseError when RPC fails", async () => {
      const mockError = { message: "RPC function not found" };
      mockSupabaseClient.rpc = vi
        .fn()
        .mockResolvedValue({ data: null, error: mockError });

      await expect(client.search("test query")).rejects.toThrow(DatabaseError);
      await expect(client.search("test query")).rejects.toThrow(
        "Search failed"
      );
    });

    it("should handle RPC throwing error", async () => {
      mockSupabaseClient.rpc = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));

      await expect(client.search("test query")).rejects.toThrow(DatabaseError);
      await expect(client.search("test query")).rejects.toThrow(
        "Search operation failed"
      );
    });

    it("should handle null data from RPC", async () => {
      mockSupabaseClient.rpc = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });

      const results = await client.search("test query");

      expect(results).toEqual([]);
    });
  });

  describe("similarity", () => {
    it("should calculate similarity between two strings", async () => {
      const { cosineSimilarity } = await import("./utils");

      const result = await client.similarity("text1", "text2");

      expect(mockProvider.createEmbedding).toHaveBeenCalledWith(
        ["text1", "text2"],
        undefined
      );
      expect(cosineSimilarity).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6]
      );
      expect(result).toBe(0.95);
    });
  });

  describe("cosineSimilarity", () => {
    it("should calculate cosine similarity between two vectors", async () => {
      const { cosineSimilarity } = await import("./utils");

      const vector1 = [0.1, 0.2, 0.3];
      const vector2 = [0.4, 0.5, 0.6];

      const result = await client.cosineSimilarity(vector1, vector2);

      expect(cosineSimilarity).toHaveBeenCalledWith(vector1, vector2);
      expect(result).toBe(0.95);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty data array in store", async () => {
      await client.store([]);

      expect(mockProvider.createEmbedding).not.toHaveBeenCalled();
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("should handle empty metadata in store", async () => {
      const data: StoreData[] = [{ content: "test" }];

      await client.store(data);

      const insertCall = (mockSupabaseClient.from as any).mock.results[0].value
        .insert;
      expect(insertCall).toHaveBeenCalledWith([
        expect.objectContaining({
          metadata: {},
        }),
      ]);
    });

    it("should handle provider errors gracefully", async () => {
      mockProvider.createEmbedding = vi
        .fn()
        .mockRejectedValue(new Error("Provider error"));

      const data: StoreData[] = [{ content: "test" }];

      await expect(client.store(data)).rejects.toThrow("Provider error");
    });

    it("should handle search with empty query", async () => {
      const results = await client.search("");

      expect(mockProvider.createEmbedding).toHaveBeenCalledWith("", undefined);
      expect(results).toEqual([
        { id: "1", content: "test content", metadata: {}, similarity: 0.9 },
      ]);
    });

    it("should handle search select with non-existent fields", async () => {
      const options = { select: "id, non_existent_field" };
      const mockData = [{ id: "1", content: "test" }];

      mockSupabaseClient.rpc = vi
        .fn()
        .mockResolvedValue({ data: mockData, error: null });

      const results = await client.search("test query", options);

      expect(results).toEqual([{ id: "1" }]);
    });
  });
});
