import router from "next/router";
import { Loading } from "./Loading";
import { Error } from "./Error";
import { useAuth } from "../../firebase/authContext";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading: loadingUser, error: errorUser } = useAuth();

  if (!user && !loadingUser) {
    router.push("/login");
  } else if (errorUser) {
    return <Error msg={errorUser?.message} />;
  } else if (loadingUser) return <Loading />;
  else if (user) return children;

  return null;
};

export { ProtectedRoute };
