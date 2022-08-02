import type { NextPage } from "next";
import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { Loading } from "../components/Loading";
import { Error } from "../components/Error";
import { auth } from "../firebase/firebase";
import Login from "./Login";
import ShowApp from "./showApp";

const App: NextPage = () => {
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    console.log(user);
  }, [user]);

  if (loading) return <Loading />;
  else if (error) return <Error msg={error} />;
  else if (user) {
    return <ShowApp user={user} />;
  } else {
    return <Login />;
  }
};

export default App;
