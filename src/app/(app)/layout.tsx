import { AdminList } from "types/types";
import { getLists } from "db/getLists";
import ShowApp from "./ShowApp";
import { verifyAuthToken } from "auth/verifyAuthToken";

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const { user } = await verifyAuthToken();
  const serializedLists = user ? await getLists(user) : undefined;
  const prefetchedLists = serializedLists
    ? (JSON.parse(serializedLists) as AdminList[])
    : undefined;

  return <ShowApp prefetchedLists={prefetchedLists}>{children}</ShowApp>;
};

export default AppLayout;
