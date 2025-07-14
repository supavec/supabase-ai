export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2)
  }
  
  return Math.sqrt(sum)
}

export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let product = 0
  for (let i = 0; i < a.length; i++) {
    product += a[i] * b[i]
  }
  
  return product
}

export function magnitude(vector: number[]): number {
  let sum = 0
  for (const component of vector) {
    sum += component * component
  }
  return Math.sqrt(sum)
}

export function normalize(vector: number[]): number[] {
  const mag = magnitude(vector)
  if (mag === 0) return vector
  return vector.map(component => component / mag)
}