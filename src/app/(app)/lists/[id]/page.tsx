import { getLists } from "db/getLists";
import { redirect } from "next/navigation";
import { AdminList } from "types/types";
import { AddButton } from "./addButton/AddButton";
import { ItemDndContext } from "./items/ItemDndContext";
import { ItemsContextProvider } from "./itemsContext";
import getServerSession from "auth/getServerSession";

// TODO: also prerender items/sections of list with id param

// TODO: check if the call to getLists() is automatically deduped, if not
// whether it can be avoided

const page = async ({ params }: { params: { id: string } }) => {
const {user} = await getServerSession();

  const prefetchedLists = user ? await getLists(user.uid) : undefined;
  const cleanLists = prefetchedLists
    ? (JSON.parse(prefetchedLists) as AdminList[])
    : undefined;

  const activeList = cleanLists?.find((list) => list.ref.id === params.id);
  if (!activeList) redirect("/lists");

  return (
    <>
      {user && (
        <ItemsContextProvider list={activeList} userId={user.uid}>
          <ItemDndContext list={activeList} />
          <AddButton activeList={activeList} />
        </ItemsContextProvider>
      )}
    </>
  );
};

export default page;
