import { verifySession } from "auth/verifySession";
import { getLists } from "db/getLists";
import { redirect } from "next/navigation";
import { AdminList } from "types/types";
import { AddButton } from "./addButton/AddButton";
import { ItemDndContext } from "./items/ItemDndContext";
import { ItemsContextProvider } from "./itemsContext";

// TODO: also prerender items/sections of list with id param

// TODO: check if the call to getLists() is automatically deduped, if not
// whether it can be avoided

const page = async ({ params }: { params: { id: string } }) => {
  const { user } = await verifySession();
  const cleanUser = user ? JSON.parse(JSON.stringify(user)) : undefined;
  console.log("user on item level: ", user?.email);

  const prefetchedLists = user ? await getLists(user) : undefined;
  const cleanLists = prefetchedLists
    ? (JSON.parse(prefetchedLists) as AdminList[])
    : undefined;

  const activeList = cleanLists?.find((list) => list.ref.id === params.id);
  if (!activeList) redirect("/lists");
  console.log("activeList on item level: ", activeList.data.name);

  return (
    <>
      {user && (
        <ItemsContextProvider list={activeList} user={cleanUser}>
          <ItemDndContext list={activeList} />
          <AddButton activeList={activeList} />
        </ItemsContextProvider>
      )}
    </>
  );
};

export default page;
