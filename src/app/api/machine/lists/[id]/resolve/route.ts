import { NextResponse } from "next/server";
import { checkMachineAuth } from "../../../../../../server/machineAuth";
import { prisma } from "../../../../../../db/prisma";
import { findBestMatch } from "../../../../../../server/itemMatching";

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
    const { items } = body as { items: string[] };

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "items array required" }, { status: 400 });
    }

    // Fetch existing items for this list with aliases
    const existingItems = await prisma.item.findMany({
      where: { listID: listId },
      include: { aliases: true },
    });

    const results = items.map(query => {
      const match = findBestMatch(query, existingItems as any);
      return {
        query,
        matchType: match.matchType,
        confidence: match.confidence,
        existingItemId: match.item?.id || null,
        existingName: match.item?.name || null,
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Resolve error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
