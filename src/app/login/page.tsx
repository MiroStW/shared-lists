import { redirect } from "next/navigation";
import ShowLogin from "./ShowLogin";
import { getFirstListId } from "db/getFirstListId";
import EmailSignUpForm from "./EmailSignUpForm";

const Page = async () => {
  const firstListId = await getFirstListId();
  if (firstListId) redirect(`/lists/${firstListId}`);

  return (
    <>
      <ShowLogin />
      <EmailSignUpForm />
    </>
  );
};

export default Page;
