import { redirect } from "next/navigation";
import { getFirstListId } from "db/getFirstListId";

const Lists = async () => {
  const firstListId = await getFirstListId();
  if (firstListId) {
    redirect(`/lists/${firstListId}`);
  } else {
    console.log("no first list id - redirecting to /signin");
    redirect("/signin");
  }
};

export default Lists;
