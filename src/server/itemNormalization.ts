export function normalizeItemName(name: string): string {
  if (!name) return "";

  // 1. Lowercase
  let normalized = name.toLowerCase().trim();

  // 2. Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ");

  // 3. Known bilingual maps or common variants
  const maps: Record<string, string> = {
    "koriander": "coriander",
    "erdnussbutter": "peanut butter",
    "frühlingszwiebeln": "spring onions",
    "frühlingszwiebel": "spring onions",
    "fruhling zwiebeln": "spring onions",
  };

  if (maps[normalized]) {
    normalized = maps[normalized];
  }

  return normalized;
}
