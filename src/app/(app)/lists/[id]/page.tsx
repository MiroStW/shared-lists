import { verifyAuthToken } from "auth/verifyAuthToken";
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
  const { user } = await verifyAuthToken();
  const cleanUser = user ? JSON.parse(JSON.stringify(user)) : undefined;

  const serializedLists = user ? await getLists(user) : undefined;
  const prefetchedLists = serializedLists
    ? (JSON.parse(serializedLists) as AdminList[])
    : undefined;

  const activeList = prefetchedLists?.find((list) => list.ref.id === params.id);
  if (!activeList) redirect("/lists");

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
