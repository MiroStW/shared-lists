import { prisma } from "db/prisma";
import getServerSession from "auth/getServerSession";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  const sectionId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { list: true }
    });

    if (!section) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (section.list.ownerID !== session.user.id) {
        // Check if contributor
        const isContributor = await prisma.list.findFirst({
            where: {
                id: section.listId,
                contributors: { some: { id: session.user.id } }
            }
        });
        if (!isContributor) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    await prisma.section.delete({
      where: { id: sectionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const session = await getServerSession();
    const sectionId = (await params).id;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { name } = body;

      const section = await prisma.section.findUnique({
        where: { id: sectionId },
        include: { list: true }
      });

      if (!section) {
          return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }

      if (section.list.ownerID !== session.user.id) {
          const isContributor = await prisma.list.findFirst({
              where: {
                  id: section.listId,
                  contributors: { some: { id: session.user.id } }
              }
          });
          if (!isContributor) {
              return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
      }

      const updatedSection = await prisma.section.update({
        where: { id: sectionId },
        data: { name },
      });

      return NextResponse.json(updatedSection);
    } catch (error) {
      console.error("Error updating section:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }
