export function chunkText(
  text: string,
  chunkSize: number,
  overlap: number = 0
): string[] {
  const chunks: string[] = [];
  const words = text.split(" ");

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    chunks.push(chunk);

    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function buildFilters(filters: Record<string, any>): any {
  const query: any = {};

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "object" && value !== null) {
      for (const [operator, operandValue] of Object.entries(value)) {
        query[`${key}.${operator}`] = operandValue;
      }
    } else {
      query[`${key}.eq`] = value;
    }
  }

  return query;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
