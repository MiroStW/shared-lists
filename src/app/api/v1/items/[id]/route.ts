import { NextResponse } from "next/server";
import { checkApiAuth } from "../../../../../server/apiAuth";
import { prisma } from "../../../../../db/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkApiAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const itemId = (await params).id;
    const body = await request.json();
    
    const updateData: { completed?: boolean; name?: string } = {};
    
    if (typeof body.completed === "boolean") {
      updateData.completed = body.completed;
    }
    if (typeof body.name === "string") {
      updateData.name = body.name;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 });
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json({ item: updatedItem });
  } catch (err) {
    console.error("PATCH item error:", err);
    
    // If the item doesn't exist, Prisma throws P2025. 
    // We can just return 404 for missing items.
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
       return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
