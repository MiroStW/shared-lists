import { prisma } from "db/prisma";
import getServerSession from "auth/getServerSession";
import { NextResponse } from "next/server";

export async function PATCH(
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
    const { name, isArchived } = body;

    const list = await prisma.list.findUnique({
      where: { id: listId },
    });

    if (!list || list.ownerID !== session.user.id) {
        // Only owner can update list metadata for now, or check for contributors if needed
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedList = await prisma.list.update({
      where: { id: listId },
      data: {
        name: name !== undefined ? name : undefined,
        isArchived: isArchived !== undefined ? isArchived : undefined,
      },
    });

    return NextResponse.json(updatedList);
  } catch (error) {
    console.error("Error updating list:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  const listId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await prisma.list.findUnique({
      where: { id: listId },
    });

    if (!list || list.ownerID !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.list.delete({
      where: { id: listId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting list:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
