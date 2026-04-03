import { prisma } from "./prisma";
import { AdminList } from "types/types";

export const getLists = async (userId: string) => {
  try {
    const lists = await prisma.list.findMany({
      where: {
        OR: [{ ownerID: userId }, { contributors: { some: { id: userId } } }],
        isArchived: false,
      },
      orderBy: {
        createdDate: "asc",
      },
      include: {
        owner: true,
        contributors: true,
      },
    });

    const formattedLists: AdminList[] = lists.map((list) => ({
      id: list.id,
      data: {
        id: list.id,
        name: list.name,
        isArchived: list.isArchived,
        createdDate: list.createdDate.toISOString(),
        ownerID: list.ownerID,
        owner: list.owner
          ? {
              id: list.owner.id,
              name: list.owner.name,
              email: list.owner.email,
              image: list.owner.image,
            }
          : undefined,
        contributors: list.contributors.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          image: c.image,
        })),
      },
    }));

    return JSON.stringify(formattedLists);
  } catch (error) {
    console.error("Error fetching lists in server component:", error);
    return JSON.stringify([]);
  }
};
