import { prisma } from "db/prisma";
import getServerSession from "auth/getServerSession";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  const itemId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, completed, description, order, sectionID, listID } = body;

    // Verify ownership/contribution
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { list: true }
    });

    if (!item) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Check if user has access to the list the item belongs to
    const hasAccess = item.list.ownerID === session.user.id ||
                     await prisma.list.findFirst({
                         where: {
                             id: item.listID,
                             contributors: { some: { id: session.user.id } }
                         }
                     });

    if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        name: name !== undefined ? name : undefined,
        completed: completed !== undefined ? completed : undefined,
        description: description !== undefined ? description : undefined,
        order: order !== undefined ? order : undefined,
        sectionID: sectionID !== undefined ? (sectionID || null) : undefined,
        listID: listID !== undefined ? listID : undefined,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  const itemId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { list: true }
    });

    if (!item) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const hasAccess = item.list.ownerID === session.user.id ||
                     await prisma.list.findFirst({
                         where: {
                             id: item.listID,
                             contributors: { some: { id: session.user.id } }
                         }
                     });

    if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.item.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
