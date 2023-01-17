import { getLists } from "app/(app)/getLists";
import { redirect } from "next/navigation";
import { AdminList } from "types/types";
import ShowItems from "./ShowItems";

// TODO: also prerender items/sections of list with id param

// TODO: check if the call to getLists() is automatically deduped, if not
// whether it can be avoided
const page = async ({ params }: { params: { id: string } }) => {
  const serializedLists = await getLists();
  if (!serializedLists) redirect("/login");
  const prefetchedLists = JSON.parse(serializedLists) as AdminList[];

  const activeList = prefetchedLists.find((list) => list.ref.id === params.id);
  if (!activeList) redirect("/lists");

  return <ShowItems activeList={activeList} />;
};

export default page;
