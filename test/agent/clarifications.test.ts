import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Item, List, User } from "@prisma/client";
import { prisma } from "db/prisma";
import {
  formatQuestion,
  matchAnswer,
  validateOptions,
} from "server/agent/clarifications";
import { runAgentCommand } from "server/agent/listAgent";
import { ListServiceError } from "server/lists/access";
import { personActor, type Actor } from "server/lists/actor";
import { undoLastCommand } from "server/lists/undo";
import { resetDatabase } from "../setup/db";
import * as fixtures from "../lists/fixtures";
import {
  callTools,
  installFakeModel,
  reply,
  systemText,
  toolUse,
  type FakeModel,
} from "./fakeModel";

let owner: User;
let actor: Actor;
let groceries: List;
let milk: Item;
let oatMilk: Item;
let model: FakeModel;
let restoreModel: () => void;

const sentence = (who: Actor, value: string) =>
  runAgentCommand(who, { text: value });

const reopenOption = (label: string, item: Item) => ({
  label,
  tool: "set_item_completed",
  input: { item_id: item.id, completed: false },
});

const askTurn = (options: unknown[], question = "Welche Milch?") =>
  callTools(toolUse("ask_user", { question, options }));

// Lets the agent ask "Welche Milch?" with Milch (1) and Hafermilch (2).
const askAboutMilk = async (who: Actor = actor) => {
  model.script(
    askTurn([
      reopenOption("Milch wieder drauf", milk),
      reopenOption("Hafermilch wieder drauf", oatMilk),
    ]),
  );
  return sentence(who, "Milch drauf");
};

const completed = async (item: Item) =>
  (await prisma.item.findUniqueOrThrow({ where: { id: item.id } })).completed;

const caughtError = async (fn: () => Promise<unknown>) =>
  (await fixtures.caught(fn)) as ListServiceError | null;

describe("clarifications", () => {
  beforeEach(async () => {
    await resetDatabase();
    owner = await fixtures.createUser("clarify-owner");
    actor = personActor(owner.id);
    groceries = await fixtures.createList(owner.id, { name: "Groceries" });
    milk = await fixtures.createItem(groceries.id, {
      name: "Milch",
      completed: true,
    });
    oatMilk = await fixtures.createItem(groceries.id, {
      name: "Hafermilch",
      completed: true,
      order: 1,
    });
    ({ model, restore: restoreModel } = installFakeModel());
  });

  afterEach(() => restoreModel());

  test("G-AE2: a question answers needs_choice with numbered options and writes nothing", async () => {
    const response = await askAboutMilk();

    expect(response.status).toBe("needs_choice");
    expect(response.message).toBe(
      "Welche Milch?\n1. Milch wieder drauf\n2. Hafermilch wieder drauf",
    );
    expect(response.changes).toEqual([]);
    expect(response.clarification).toMatchObject({
      question: "Welche Milch?",
      options: [
        { number: 1, label: "Milch wieder drauf" },
        { number: 2, label: "Hafermilch wieder drauf" },
      ],
    });
    expect(await prisma.listEvent.count()).toBe(0);
    const stored = await prisma.clarification.findFirstOrThrow();
    expect(stored).toMatchObject({
      id: response.clarification!.id,
      commandId: response.command_id,
      actorUserId: owner.id,
      inputText: "Milch drauf",
      resolvedAt: null,
    });
    const minutes =
      (stored.expiresAt.getTime() - stored.createdAt.getTime()) / 60000;
    expect(Math.round(minutes)).toBe(30);
  });

  test("F2: the answer '2' reopens Hafermilch without the model and without a duplicate", async () => {
    const asked = await askAboutMilk();

    const response = await sentence(actor, "2");

    expect(model.calls).toBe(1);
    expect(response).toMatchObject({
      status: "done",
      message: "OK: Hafermilch wieder drauf",
      command_id: asked.command_id,
      clarification: null,
      changes: [
        { type: "item.reopened", item: "Hafermilch", list: "Groceries" },
      ],
    });
    expect(await completed(oatMilk)).toBe(false);
    expect(await completed(milk)).toBe(true);
    expect(await prisma.item.count({ where: { listID: groceries.id } })).toBe(
      2,
    );
    expect(
      (await prisma.clarification.findFirstOrThrow()).resolvedAt,
    ).not.toBeNull();
    // The answer's event belongs to the sentence's command.
    expect((await prisma.listEvent.findFirstOrThrow()).commandId).toBe(
      asked.command_id!,
    );
  });

  test("an option label answers too, ignoring case", async () => {
    await askAboutMilk();

    const response = await sentence(actor, "  milch WIEDER drauf ");

    expect(response.status).toBe("done");
    expect(await completed(milk)).toBe(false);
    expect(model.calls).toBe(1);
  });

  test("a structured answer with clarification_id and option 1 runs option 1", async () => {
    const asked = await askAboutMilk();

    const response = await runAgentCommand(actor, {
      clarificationId: asked.clarification!.id,
      option: 1,
    });

    expect(response.status).toBe("done");
    expect(await completed(milk)).toBe(false);
    expect(await completed(oatMilk)).toBe(true);
  });

  test("a structured answer with an unknown option or id is rejected", async () => {
    const asked = await askAboutMilk();

    const outOfRange = await caughtError(() =>
      runAgentCommand(actor, {
        clarificationId: asked.clarification!.id,
        option: 3,
      }),
    );
    expect(outOfRange).toBeInstanceOf(ListServiceError);
    expect(outOfRange!.kind).toBe("invalid");

    const unknown = await caughtError(() =>
      runAgentCommand(actor, { clarificationId: "nope", option: 1 }),
    );
    expect(unknown!.kind).toBe("not_found");
    expect(await prisma.listEvent.count()).toBe(0);
  });

  test("an expired question is not run; '2' goes to the agent as a sentence", async () => {
    await askAboutMilk();
    await prisma.clarification.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    model.script(reply("Was meinst du mit 2?"));

    const response = await sentence(actor, "2");

    expect(model.calls).toBe(2);
    expect(response).toMatchObject({
      status: "done",
      message: "Was meinst du mit 2?",
    });
    expect(await completed(oatMilk)).toBe(true);
    expect(await prisma.command.count({ where: { inputText: "2" } })).toBe(1);
    // An expired question is no context for the new sentence.
    expect(systemText(model.requests[1])).not.toContain("Welche Milch?");
  });

  test("another person's question is not answered", async () => {
    await askAboutMilk();
    const other = await fixtures.createUser("clarify-other");
    await fixtures.createList(other.id, { name: "Other list" });
    model.script(reply("Was meinst du?"));

    const response = await sentence(personActor(other.id), "2");

    expect(response.status).toBe("done");
    expect(model.calls).toBe(2);
    expect(await completed(oatMilk)).toBe(true);
    expect(
      (await prisma.clarification.findFirstOrThrow()).resolvedAt,
    ).toBeNull();
    const structured = await caughtError(async () =>
      runAgentCommand(personActor(other.id), {
        clarificationId: (await prisma.clarification.findFirstOrThrow()).id,
        option: 2,
      }),
    );
    expect(structured!.kind).toBe("not_found");
  });

  test("other text is a new sentence with the open question as context; the question lapses", async () => {
    await askAboutMilk();
    model.script(
      callTools(toolUse("add_items", { list: "Groceries", items: ["Brot"] })),
      reply("Brot ist drauf."),
    );

    const response = await sentence(actor, "lieber Brot");

    expect(response.status).toBe("done");
    const system = systemText(model.requests[1]);
    expect(system).toContain('Earlier you asked about "Milch drauf"');
    expect(system).toContain("2. Hafermilch wieder drauf");
    expect(
      (await prisma.clarification.findFirstOrThrow()).resolvedAt,
    ).not.toBeNull();
    expect(await completed(oatMilk)).toBe(true);

    // "2" now has nothing to answer and goes to the model.
    model.script(reply("Wozu 2?"));
    await sentence(actor, "2");
    expect(model.calls).toBe(4);
    expect(await completed(oatMilk)).toBe(true);
  });

  test("a new question replaces the older open one", async () => {
    const first = await askAboutMilk();
    model.script(
      askTurn(
        [reopenOption("Hafermilch", oatMilk), reopenOption("Milch", milk)],
        "Welche denn?",
      ),
    );
    await sentence(actor, "Milch!");

    const open = await prisma.clarification.findMany({
      where: { resolvedAt: null },
    });
    expect(open).toHaveLength(1);
    expect(open[0].question).toBe("Welche denn?");
    const old = await caughtError(() =>
      runAgentCommand(actor, {
        clarificationId: first.clarification!.id,
        option: 1,
      }),
    );
    expect(old!.kind).toBe("not_found");

    await sentence(actor, "1");
    expect(await completed(oatMilk)).toBe(false);
  });

  test("ask_user options with invalid tool calls are dropped", async () => {
    model.script(
      askTurn([
        {
          label: "Fehlt completed",
          tool: "set_item_completed",
          input: { item_id: milk.id },
        },
        { label: "Unbekannt", tool: "delete_everything", input: {} },
        { label: "Rückgängig", tool: "undo_last_command", input: {} },
        {
          label: "",
          tool: "set_item_completed",
          input: { item_id: milk.id, completed: false },
        },
        reopenOption("Hafermilch wieder drauf", oatMilk),
      ]),
    );

    const response = await sentence(actor, "Milch drauf");

    expect(response.status).toBe("needs_choice");
    expect(response.clarification!.options).toEqual([
      { number: 1, label: "Hafermilch wieder drauf" },
    ]);
    expect(response.message).toBe("Welche Milch?\n1. Hafermilch wieder drauf");
  });

  test("without any valid option the sentence ends with status error and no question", async () => {
    model.script(
      askTurn([
        {
          label: "Kaputt",
          tool: "set_item_completed",
          input: { completed: "no" },
        },
        { label: "Unbekannt", tool: "nope", input: {} },
      ]),
    );

    const response = await sentence(actor, "Milch drauf");

    expect(response).toMatchObject({ status: "error", clarification: null });
    expect(await prisma.clarification.count()).toBe(0);
  });

  test("an answer after the sentence was undone becomes a change of its own", async () => {
    model.script(
      callTools(toolUse("add_items", { list: "Groceries", items: ["Brot"] })),
      askTurn([reopenOption("Hafermilch wieder drauf", oatMilk)]),
    );
    const asked = await sentence(actor, "Milch und Brot drauf");
    // Undone elsewhere, e.g. with the undo tool; the question stays open.
    await undoLastCommand(actor);

    const response = await sentence(actor, "1");

    expect(response.status).toBe("done");
    expect(response.command_id).not.toBe(asked.command_id);
    expect(await completed(oatMilk)).toBe(false);
    expect(
      await prisma.command.findUniqueOrThrow({
        where: { id: response.command_id! },
      }),
    ).toMatchObject({ inputText: "Milch und Brot drauf", undoState: "none" });
    expect(
      (
        await prisma.command.findUniqueOrThrow({
          where: { id: asked.command_id! },
        })
      ).undoState,
    ).toBe("undone");
  });

  test("matchAnswer accepts bare numbers and labels only", () => {
    const options = [{ label: "Milch" }, { label: "Hafermilch" }];
    expect(matchAnswer(options, "2")).toBe(2);
    expect(matchAnswer(options, " 1. ")).toBe(1);
    expect(matchAnswer(options, "3")).toBeNull();
    expect(matchAnswer(options, "0")).toBeNull();
    expect(matchAnswer(options, "HAFERMILCH")).toBe(2);
    expect(matchAnswer(options, "2 Milch")).toBeNull();
    expect(formatQuestion("Welche?", options)).toBe(
      "Welche?\n1. Milch\n2. Hafermilch",
    );
  });

  test("validateOptions keeps only calls that match a registry schema", () => {
    expect(validateOptions("nope")).toEqual([]);
    expect(
      validateOptions([
        {
          label: "A",
          tool: "add_items",
          input: { list: "Groceries", items: ["A"] },
        },
        { label: "B", tool: "add_items", input: { list: "Groceries" } },
        { label: "C", tool: "ask_user", input: {} },
      ]),
    ).toEqual([
      {
        label: "A",
        tool: "add_items",
        input: { list: "Groceries", items: ["A"] },
      },
    ]);
  });
});
