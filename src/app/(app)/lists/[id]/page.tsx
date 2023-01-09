import { redirect } from "next/navigation";
import { AdminList } from "types/types";
import { adminDb } from "../../../../firebase/firebaseAdmin";
import { verifyAuthToken } from "../../../verifyAuthToken";
import ShowItems from "./ShowItems";

// TODO: also prerender items/sections of list with id param

// TODO: I need the Lists object here, should I refetch it or import it as
// layout is also server-component?
const page = async ({ params }: { params: { id: string } }) => {
  const activeList = prefetchedLists.find((list) => list.ref.id === params.id);
  if (!activeList) redirect("/lists");

  return (
    <ShowItems prefetchedLists={prefetchedLists} activeList={activeList} />
  );
};

export default page;
