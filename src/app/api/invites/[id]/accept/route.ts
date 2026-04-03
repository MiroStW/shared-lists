import { prisma } from "db/prisma";
import getServerSession from "auth/getServerSession";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  const inviteId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.inviteeEmail !== session.user.email) {
        return NextResponse.json({ error: "This invite is not for you" }, { status: 403 });
    }

    if (invite.status !== "pending") {
        return NextResponse.json({ error: "Invite already processed" }, { status: 400 });
    }

    // Add user as contributor to the list
    await prisma.list.update({
        where: { id: invite.listID },
        data: {
            contributors: {
                connect: { id: session.user.id }
            }
        }
    });

    // Update invite status
    const updatedInvite = await prisma.invite.update({
      where: { id: inviteId },
      data: { status: "accepted" },
    });

    return NextResponse.json(updatedInvite);
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
