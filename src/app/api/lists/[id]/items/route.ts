import { prisma } from "db/prisma";
import getServerSession from "auth/getServerSession";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  const listId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is owner or contributor to the list
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

    const items = await prisma.item.findMany({
      where: {
        listID: listId,
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
    const { name, sectionID, order } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if user is owner or contributor to the list
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

    const newItem = await prisma.item.create({
      data: {
        name,
        listID: listId,
        sectionID: sectionID || null,
        order: order || 0,
      },
    });

    return NextResponse.json(newItem);
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
