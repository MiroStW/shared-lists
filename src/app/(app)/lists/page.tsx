import { redirect } from "next/navigation";
import { getFirstListId } from "db/getFirstListId";

const Lists = async () => {
  const firstListId = await getFirstListId();
  if (firstListId) redirect(`/lists/${firstListId}`);

  return null;
};

export default Lists;
