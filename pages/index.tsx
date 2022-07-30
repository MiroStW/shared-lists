import type { NextPage } from "next";
import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/firebase";
import Login from "./Login";
import ShowApp from "./showApp";

const App: NextPage = () => {
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    console.log(user);
  }, [user]);

  if (!user) return <Login />;

  return <ShowApp />;
};
export default App;
