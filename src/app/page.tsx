import Home from "./Home";
import { verifyAuthToken } from "./context/verifyAuthToken";

const getUser = async () => {
  const { user, auth } = await verifyAuthToken();
  console.log("user", user);
  // JSON.stringify(user?.toJSON()); //
  return { user, auth };
};

const Page = async () => {
  const { user, auth } = await getUser();
  // const user = serializedUser
  //   ? (JSON.parse(serializedUser) as User)
  //   : undefined;

  return <Home user={user} />;
};

export default Page;
