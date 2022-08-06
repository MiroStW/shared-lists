import type { NextPage } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { Loading } from "../components/utils/Loading";
import { Error } from "../components/utils/Error";
import { useAuth } from "../firebase/authContext";
import { useLists } from "../firebase/listsContext";

const App: NextPage = () => {
  const router = useRouter();
  const { user, loading: loadingUser, error: errorUser } = useAuth();
  const { lists, loading: loadingLists, error: errorLists } = useLists();

  useEffect(() => {
    console.log(user);
  }, [user]);

  if (loadingUser || loadingLists) return <Loading />;
  else if (errorUser || errorLists)
    return <Error msg={errorUser?.message || errorLists?.message} />;
  else if (user && lists) {
    router.push(`/lists/${lists[0].ref.id}`);
  } else {
    router.push("/login");
  }
  return null;
};

export default App;
