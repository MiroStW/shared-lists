import { prisma } from "./prisma";
import getServerSession from "../auth/getServerSession";

export const getFirstListId = async () => {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (userId) {
    const list = await prisma.list.findFirst({
      where: {
        ownerID: userId,
        isArchived: false,
      },
      orderBy: {
        createdDate: "asc",
      },
    });

    if (!list) {
      const newList = await prisma.list.create({
        data: {
          name: "my first list",
          ownerID: userId,
        },
      });

      return newList.id;
    }

    return list.id;
  }
  return null;
};
