import type { NextPage } from "next";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/firebase";
import Login from "./Login";
import ShowApp from "./showApp";

const Home: NextPage = () => {
  const [user, loading, error] = useAuthState(auth);

  if (!user) return <Login />;

  return <ShowApp />;
};
export default Home;
