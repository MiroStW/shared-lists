import { redirect } from "next/navigation";
import { AdminList } from "types/types";
import { getLists } from "db/getLists";
import ShowApp from "./ShowApp";
import { verifyAuthToken } from "auth/verifyAuthToken";

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const { user } = await verifyAuthToken();
  const serializedLists = await getLists(user);
  if (!serializedLists) redirect("/login");
  const prefetchedLists = JSON.parse(serializedLists) as AdminList[];

  return <ShowApp prefetchedLists={prefetchedLists}>{children}</ShowApp>;
};

export default AppLayout;
