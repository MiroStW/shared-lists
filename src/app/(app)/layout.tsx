import { AdminList } from "types/types";
import { getLists } from "db/getLists";
import ShowApp from "./ShowApp";
import { getServerSession } from "auth/getServerSession";
import { redirect } from "next/navigation";

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const { user } = await getServerSession();
  if (!user) redirect("/signin");

  const serializedLists = user && (await getLists(user.uid));
  const prefetchedLists = serializedLists
    ? (JSON.parse(serializedLists) as AdminList[])
    : undefined;

  return <ShowApp prefetchedLists={prefetchedLists}>{children}</ShowApp>;
};

export default AppLayout;
