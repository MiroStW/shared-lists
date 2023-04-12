import { redirect } from "next/navigation";
import ShowLogin from "./ShowLogin";
import { getFirstListId } from "db/getFirstListId";
import EmailSignUpForm from "./EmailSignUpForm";
import SignInWithEmail from "./SignInWithEmail";
import SignInOptions from "./SignInOptions";

const Page = async () => {
  const firstListId = await getFirstListId();
  if (firstListId) redirect(`/lists/${firstListId}`);

  return (
    <>
      <ShowLogin />
      <SignInOptions />
    </>
  );
};

export default Page;
