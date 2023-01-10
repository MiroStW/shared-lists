import { redirect } from "next/navigation";
import { AdminList } from "types/types";
import { getLists } from "./getLists";
import ShowApp from "./ShowApp";

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const serializedLists = await getLists();
  if (!serializedLists) redirect("/login");
  const prefetchedLists = JSON.parse(serializedLists) as AdminList[];

  return <ShowApp prefetchedLists={prefetchedLists}>{children}</ShowApp>;
};

export default AppLayout;
