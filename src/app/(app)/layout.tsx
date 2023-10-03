import { AdminList } from "types/types";
import { getLists } from "db/getLists";
import ShowApp from "./ShowApp";
import getServerSession from "auth/getServerSession";

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const { user } = await getServerSession()
  const serializedLists = user && (await getLists(user.uid));
  const prefetchedLists = serializedLists
    ? (JSON.parse(serializedLists) as AdminList[])
    : undefined;

  return <ShowApp prefetchedLists={prefetchedLists}>{children}</ShowApp>;
};

export default AppLayout;
