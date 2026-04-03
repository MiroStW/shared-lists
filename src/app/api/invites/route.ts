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
    const { inviteeEmail, listId } = body;

    const list = await prisma.list.findUnique({
      where: { id: listId },
    });

    if (!list || list.ownerID !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invite = await prisma.invite.create({
      data: {
        inviterID: session.user.id,
        inviterName: session.user.name || session.user.email || "Unknown",
        inviteeEmail,
        listID: listId,
        listName: list.name,
      },
    });

    return NextResponse.json(invite);
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
