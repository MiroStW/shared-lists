import { NextResponse } from "next/server";
import { checkApiAuth } from "../../../../../../server/apiAuth";
import { prisma } from "../../../../../../db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkApiAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const listId = (await params).id;
    
    const items = await prisma.item.findMany({
      where: { listID: listId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET items error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkApiAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const listId = (await params).id;
    const body = await request.json();
    
    if (!body || typeof body.name !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'name' field" }, { status: 400 });
    }

    const newItem = await prisma.item.create({
      data: {
        listID: listId,
        name: body.name,
        completed: false,
      },
    });

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (err) {
    console.error("POST item error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
