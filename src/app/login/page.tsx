import { redirect } from "next/navigation";
import ShowLogin from "./ShowLogin";
import { getFirstListId } from "db/getFirstListId";

const Page = async () => {
  const firstListId = await getFirstListId();
  if (firstListId) redirect(`/lists/${firstListId}`);

  return <ShowLogin />;
};

export default Page;
