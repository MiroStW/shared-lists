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

    const sections = await prisma.section.findMany({
      where: {
        listId: listId,
      },
      orderBy: {
        createdDate: "asc",
      },
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
