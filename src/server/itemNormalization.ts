// Lowercase, trimmed, with single spaces. The plain form for comparing names.
export const simplifyItemName = (name: string): string =>
  (name ?? "").toLowerCase().trim().replace(/\s+/g, " ");

// Known bilingual names and common variants, mapped to one canonical form.
const BILINGUAL_NAMES: Record<string, string> = {
  koriander: "coriander",
  erdnussbutter: "peanut butter",
  frühlingszwiebeln: "spring onions",
  frühlingszwiebel: "spring onions",
  "fruhling zwiebeln": "spring onions",
};

// The stored normalized name: the simplified name, translated when the
// bilingual table knows it.
export function normalizeItemName(name: string): string {
  const simplified = simplifyItemName(name);
  return BILINGUAL_NAMES[simplified] ?? simplified;
}
