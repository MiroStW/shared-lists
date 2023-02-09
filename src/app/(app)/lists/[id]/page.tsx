import { getLists } from "db/getLists";
import { getUser } from "db/getUser";
import { UserRecord } from "firebase-admin/auth";
import { redirect } from "next/navigation";
import { AdminList } from "types/types";
import ShowItems from "./ShowItems";

// TODO: also prerender items/sections of list with id param

// TODO: check if the call to getLists() is automatically deduped, if not
// whether it can be avoided

const page = async ({ params }: { params: { id: string } }) => {
  const serializedUser = await getUser();
  if (!serializedUser) redirect("/login");
  const { user } = JSON.parse(serializedUser) as { user: UserRecord };

  const serializedLists = await getLists(user);
  if (!serializedLists) redirect("/login");
  const prefetchedLists = JSON.parse(serializedLists) as AdminList[];

  const activeList = prefetchedLists.find((list) => list.ref.id === params.id);
  if (!activeList) redirect("/lists");

  return <ShowItems activeList={activeList} user={user} />;
};

export default page;
