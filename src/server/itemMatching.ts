import { normalizeItemName } from "./itemNormalization";
import { Item, ItemAlias } from "@prisma/client";

export type PopulatedItem = Item & { aliases?: ItemAlias[] };

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

export function findBestMatch(
  query: string,
  items: PopulatedItem[]
) {
  const normalizedQuery = normalizeItemName(query);
  
  if (!normalizedQuery) return { item: null, confidence: 0, matchType: "none" };

  let bestMatch: PopulatedItem | null = null;
  let highestConfidence = 0;
  let matchType = "none";

  for (const item of items) {
    const itemNorm = item.normalized || normalizeItemName(item.name);
    
    // 1. Exact match on normalized name
    if (itemNorm === normalizedQuery) {
      return { item, confidence: 1.0, matchType: "exact" };
    }

    // 2. Exact match on aliases
    if (item.aliases) {
      for (const alias of item.aliases) {
        if (alias.normalized === normalizedQuery || alias.alias.toLowerCase() === query.toLowerCase()) {
          return { item, confidence: 1.0, matchType: "alias" };
        }
      }
    }

    // 3. Fuzzy match
    const dist = levenshtein(normalizedQuery, itemNorm);
    const maxLen = Math.max(normalizedQuery.length, itemNorm.length);
    const similarity = 1 - dist / maxLen;

    if (similarity > highestConfidence) {
      highestConfidence = similarity;
      bestMatch = item;
      matchType = "fuzzy";
    }
  }

  // Threshold for fuzzy matching
  if (highestConfidence < 0.75) {
    return { item: null, confidence: highestConfidence, matchType: "none" };
  }

  return { item: bestMatch, confidence: highestConfidence, matchType };
}
