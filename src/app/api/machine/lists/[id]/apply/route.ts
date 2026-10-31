import { NextResponse } from "next/server";
import { checkMachineAuth } from "../../../../../../server/machineAuth";
import { prisma } from "../../../../../../db/prisma";
import { normalizeItemName } from "../../../../../../server/itemNormalization";

type Operation = 
  | { type: "reopen"; itemId: string; query: string }
  | { type: "create"; name: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkMachineAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const listId = (await params).id;
    const body = await request.json();
    const { operations } = body as { operations: Operation[] };

    if (!Array.isArray(operations)) {
      return NextResponse.json({ error: "operations array required" }, { status: 400 });
    }

    const results = [];

    for (const op of operations) {
      if (op.type === "reopen") {
        await prisma.item.update({
          where: { id: op.itemId },
          data: { completed: false },
        });

        results.push({ ...op, status: "success" });
      } else if (op.type === "create") {
        const normalized = normalizeItemName(op.name);
        
        const newItem = await prisma.item.create({
          data: {
            name: op.name,
            listID: listId,
            normalized,
          }
        });

        results.push({ ...op, status: "success", newId: newItem.id });
      }
    }

    return NextResponse.json({ operations: results });
  } catch (err) {
    console.error("Apply error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
