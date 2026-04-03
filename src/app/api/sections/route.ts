import { prisma } from "db/prisma";
import getServerSession from "auth/getServerSession";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, listId } = body;

    if (!name || !listId) {
      return NextResponse.json({ error: "Name and ListId are required" }, { status: 400 });
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

    const newSection = await prisma.section.create({
      data: {
        name,
        listId,
      },
    });

    return NextResponse.json(newSection);
  } catch (error) {
    console.error("Error creating section:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
