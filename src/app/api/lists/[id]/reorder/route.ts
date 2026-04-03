import { prisma } from "db/prisma";
import getServerSession from "auth/getServerSession";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  const listId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items } = body; // Array of { id: string, order: number, sectionID: string | null }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 });
    }

    // Verify access to the list
    const list = await prisma.list.findFirst({
        where: {
            id: listId,
            OR: [
                { ownerID: session.user.id },
                { contributors: { some: { id: session.user.id } } }
            ]
        }
    });

    if (!list) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Bulk update orders and sections
    // Prisma doesn't have a built-in "bulk update with different values" for sqlite/postgres easily without many queries or raw SQL
    // For now, we'll use a transaction with multiple updates
    await prisma.$transaction(
      items.map((item: any) =>
        prisma.item.update({
          where: { id: item.id },
          data: {
            order: item.order,
            sectionID: item.sectionID !== undefined ? (item.sectionID || null) : undefined,
            listID: listId
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering items:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
