import { CommandContext } from "server/lists/command";
import { personActor } from "server/lists/actor";
import { createList } from "server/lists/listService";
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
      const newList = await createList(
        new CommandContext(personActor(userId)),
        {
          name: "my first list",
        },
      );

      return newList.id;
    }

    return list.id;
  }
  return null;
};
