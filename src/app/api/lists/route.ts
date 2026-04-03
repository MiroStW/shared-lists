import { prisma } from "db/prisma";
import getServerSession from "auth/getServerSession";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lists = await prisma.list.findMany({
      where: {
        OR: [
          { ownerID: session.user.id },
          { contributors: { some: { id: session.user.id } } },
        ],
        isArchived: false,
      },
      include: {
        owner: true,
        contributors: true,
      },
      orderBy: {
        createdDate: "asc",
      },
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error("Error fetching lists:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const newList = await prisma.list.create({
      data: {
        name,
        ownerID: session.user.id,
      },
    });

    return NextResponse.json(newList);
  } catch (error) {
    console.error("Error creating list:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
