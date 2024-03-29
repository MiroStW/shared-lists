import { redirect } from "next/navigation";
import { getFirstListId } from "db/getFirstListId";
import SignInOptions from "./SignInOptions";

const Page = async () => {
  const firstListId = await getFirstListId();
  if (firstListId) redirect(`/lists/${firstListId}`);

  return (
    <>
      <h1>Please sign in</h1>
      <SignInOptions />
    </>
  );
};

export default Page;
