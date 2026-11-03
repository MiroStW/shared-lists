import { describe, expect, test } from "bun:test";
import { findCandidates, type MatchableItem } from "server/itemMatching";

let nextId = 0;
const item = (
  name: string,
  { completed = false, aliases = [] as string[] } = {},
): MatchableItem & { completed: boolean } => ({
  id: `item-${++nextId}`,
  name,
  normalized: name.toLowerCase(),
  completed,
  aliases: aliases.map((alias) => ({ alias, normalized: alias.toLowerCase() })),
});

const reasons = (query: string, items: MatchableItem[]) =>
  Object.fromEntries(
    findCandidates(query, items).map((candidate) => [
      candidate.item.name,
      candidate.reason,
    ]),
  );

describe("item matching", () => {
  test("a query finds the exact item and the compound it ends", () => {
    const candidates = findCandidates("Milch", [
      item("Hafermilch"),
      item("Brot"),
      item("Milch"),
    ]);
    expect(candidates.map(({ item, reason }) => [item.name, reason])).toEqual([
      ["Milch", "exact"],
      ["Hafermilch", "compound"],
    ]);
    expect(candidates[0].score).toBeGreaterThan(candidates[1].score);
  });

  test("matching ignores case and surrounding whitespace", () => {
    expect(reasons("  milch ", [item("MILCH")])).toEqual({ MILCH: "exact" });
  });

  test("the bilingual table maps a German name to its English item", () => {
    expect(reasons("Koriander", [item("coriander")])).toEqual({
      coriander: "alias",
    });
    expect(reasons("peanut butter", [item("Erdnussbutter")])).toEqual({
      Erdnussbutter: "alias",
    });
  });

  test("stored aliases count as strong matches", () => {
    expect(
      reasons("Scallions", [item("Spring onions", { aliases: ["Scallions"] })]),
    ).toEqual({ "Spring onions": "alias" });
  });

  test("queries shorter than four characters never match a compound", () => {
    const found = reasons("Ei", [item("Reis"), item("Eis")]);
    expect(Object.values(found)).not.toContain("compound");
    expect(reasons("Eis", [item("Reis")]).Reis).not.toBe("compound");
  });

  test("a longer query matches the compound it ends", () => {
    expect(reasons("Butter", [item("Erdnussbutter")])).toEqual({
      Erdnussbutter: "compound",
    });
  });

  test("a query in the middle or start of a name is not a compound match", () => {
    expect(reasons("Milch", [item("Milchreis")])).toEqual({});
  });

  test("close spellings are fuzzy hints only", () => {
    expect(reasons("Tomaten", [item("Tomate")])).toEqual({ Tomate: "fuzzy" });
    expect(reasons("Tomaten", [item("Gurke")])).toEqual({});
  });

  test("an empty query has no candidates", () => {
    expect(findCandidates("  ", [item("Milch")])).toEqual([]);
  });
});
