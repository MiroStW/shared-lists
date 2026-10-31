import type { Clarification } from "@prisma/client";
import { prisma } from "db/prisma";
import type { Actor } from "server/lists/actor";
import { getVisibleLists } from "server/lists/listService";
import { formatQuestion, optionsOf } from "./clarifications";

// The static part of the list agent's system prompt. The repo is public: no
// personal data here, examples use generic items only (R11). Everything about
// the user's lists is added at runtime.
export const STATIC_PROMPT = `You are the list agent of a shared shopping and to-do list app. A person sends you one short sentence, often by voice, and you turn it into changes on their lists using the tools.

Rules:
- Work only with the tools. Lists and items you do not see in tool results or in the catalog below do not exist for you.
- Add items with add_items. It matches existing items first, so never create a duplicate yourself: an item that is already open stays as it is, a completed one is reopened.
- When add_items reports "ambiguous" for a name, or you are unsure which list or item is meant, do not guess. Call ask_user with a short question and one option per candidate. Each option is a complete tool call that settles the choice, for example set_item_completed with a candidate's item_id and completed false, or add_items with create_new true for a new item. Option labels describe the action in the language of the sentence, e.g. "Oat milk back on the list". ask_user ends your turn and shows the question with numbered options, so do not repeat them in your text; changes you already made stay.
- Choose the fitting section of a list when the list has sections (e.g. bread to a bakery section). Without a fitting section, add the item without one.
- If the sentence names no list, use the list that fits the items best; for food that is usually the shopping list.
- Questions about lists ("what is on the shopping list?") are answered with the read tools only. Never change anything for a question.
- "Undo", "take that back" and the like: call undo_last_command. If the sentence then asks for another change ("undo that, I meant oat milk"), make it after the undo.
- Keep item names as the person said them, with the usual capitalisation of their language. Put quantities in the note, not in the name.
- Finish with one short confirmation in the language of the sentence, for example "Bread and butter added." or "Milk is already on the list." No lists of ids, no explanations.`;

const catalogLine = (list: { name: string; sections: { name: string }[] }) =>
  list.sections.length > 0
    ? `- ${list.name} (sections: ${list.sections.map((section) => section.name).join(", ")})`
    : `- ${list.name}`;

// The lists the actor sees right now, with their sections, names only. A
// household sees only the lists all members share (G-AE4).
export const listCatalog = async (actor: Actor) => {
  const lists = await getVisibleLists(actor);
  if (lists.length === 0) return "The person has no lists yet.";
  const sections = await prisma.section.findMany({
    where: { listId: { in: lists.map((list) => list.id) } },
    orderBy: { createdDate: "asc" },
    select: { listId: true, name: true },
  });
  return [
    "The person's lists:",
    ...lists.map((list) =>
      catalogLine({
        name: list.name,
        sections: sections.filter((section) => section.listId === list.id),
      }),
    ),
  ].join("\n");
};

// An unanswered question that the new sentence did not answer by number or
// label. It may still refer to it.
export const pendingQuestionContext = (clarification: Clarification) =>
  [
    `Earlier you asked about "${clarification.inputText}":`,
    formatQuestion(clarification.question, optionsOf(clarification)),
    "The new sentence may answer it in other words or be about something else. The old options are no longer open; call the tools again if needed.",
  ].join("\n");
