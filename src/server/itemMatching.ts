import { normalizeItemName, simplifyItemName } from "./itemNormalization";

// Deterministic matching of a name against existing items (KTD9). It does not
// decide; it lists candidates with a reason and a score, strongest first:
// - exact: same name, ignoring case and spacing
// - alias: same canonical name via the bilingual table or a stored alias
// - compound: the query is the final part of a longer name ("Hafermilch"
//   for "Milch"), only for queries of at least four characters
// - fuzzy: a close spelling, a hint only
export type MatchReason = "exact" | "alias" | "compound" | "fuzzy";

export type MatchableItem = {
  id: string;
  name: string;
  normalized?: string | null;
  aliases?: { alias: string; normalized: string }[];
};

export type MatchCandidate<T extends MatchableItem> = {
  item: T;
  reason: MatchReason;
  score: number;
};

export const MIN_COMPOUND_QUERY_LENGTH = 4;
const FUZZY_THRESHOLD = 0.75;
const SCORES = { exact: 1, alias: 0.95, compound: 0.8 } as const;
// Fuzzy scores stay below every other reason.
const FUZZY_WEIGHT = 0.75;

export const isStrongMatch = (reason: MatchReason) =>
  reason === "exact" || reason === "alias";

const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[b.length];
};

const similarity = (a: string, b: string) =>
  1 - levenshtein(a, b) / Math.max(a.length, b.length);

// The plain and the canonical form of a name, plus a stored normalized value.
const formsOf = (name: string, normalized?: string | null) => [
  ...new Set(
    [
      simplifyItemName(name),
      normalizeItemName(name),
      normalized ? simplifyItemName(normalized) : "",
    ].filter(Boolean),
  ),
];

const matchItem = (
  queryPlain: string,
  queryForms: string[],
  item: MatchableItem,
): { reason: MatchReason; score: number } | null => {
  if (simplifyItemName(item.name) === queryPlain) {
    return { reason: "exact", score: SCORES.exact };
  }

  const itemForms = formsOf(item.name, item.normalized);
  const aliasForms = (item.aliases ?? []).flatMap((alias) =>
    formsOf(alias.alias, alias.normalized),
  );
  if (
    queryForms.some(
      (form) => itemForms.includes(form) || aliasForms.includes(form),
    )
  ) {
    return { reason: "alias", score: SCORES.alias };
  }

  const isCompound = queryForms.some(
    (query) =>
      query.length >= MIN_COMPOUND_QUERY_LENGTH &&
      itemForms.some(
        (form) => form.length > query.length && form.endsWith(query),
      ),
  );
  if (isCompound) return { reason: "compound", score: SCORES.compound };

  const best = Math.max(
    ...queryForms.flatMap((query) =>
      itemForms.map((form) => similarity(query, form)),
    ),
  );
  if (best >= FUZZY_THRESHOLD) {
    return { reason: "fuzzy", score: best * FUZZY_WEIGHT };
  }
  return null;
};

// All items that match query, strongest first.
export const findCandidates = <T extends MatchableItem>(
  query: string,
  items: T[],
): MatchCandidate<T>[] => {
  const queryPlain = simplifyItemName(query);
  if (!queryPlain) return [];
  const queryForms = formsOf(query);

  return items
    .flatMap((item) => {
      const match = matchItem(queryPlain, queryForms, item);
      return match ? [{ item, ...match }] : [];
    })
    .sort((a, b) => b.score - a.score);
};

export type AdditionDecision<T extends MatchableItem & { completed: boolean }> =
  | { action: "create"; hints: MatchCandidate<T>[] }
  | { action: "already_open"; item: T }
  | { action: "reopen"; item: T }
  | { action: "ambiguous"; candidates: MatchCandidate<T>[] };

// What adding a name to a list should do, given its candidates (KTD9):
// 1. an open strong match means the item is already on the list;
// 2. a single completed strong match without other strong or compound
//    candidates is reopened;
// 3. without strong or compound candidates a new item is created, and fuzzy
//    candidates are returned as hints;
// 4. anything else is ambiguous and left to the caller to resolve.
export const decideAddition = <
  T extends MatchableItem & { completed: boolean },
>(
  candidates: MatchCandidate<T>[],
): AdditionDecision<T> => {
  const relevant = candidates.filter(({ reason }) => reason !== "fuzzy");
  const openStrong = relevant.find(
    ({ reason, item }) => isStrongMatch(reason) && !item.completed,
  );
  if (openStrong) return { action: "already_open", item: openStrong.item };
  if (relevant.length === 0) return { action: "create", hints: candidates };
  const [only] = relevant;
  if (relevant.length === 1 && isStrongMatch(only.reason)) {
    return { action: "reopen", item: only.item };
  }
  return { action: "ambiguous", candidates: relevant };
};
