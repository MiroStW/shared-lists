import { connectAuthEmulator, getAuth, User } from "firebase/auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { firebase } from "./firebase";
import { Cookie, withCookie } from "next-cookie";

const auth = getAuth(firebase);

// comment out this line to switch to production db
if (process.env.NEXT_PUBLIC_DEVELOPMENT === "TRUE")
  connectAuthEmulator(auth, "http://localhost:9099");

const authContext = createContext({
  user: null as User | null | undefined,
  loading: true,
  error: undefined as unknown | undefined,
  auth,
});

const AuthContextProvider = ({
  children,
  cookie,
}: {
  children: ReactNode;
  cookie: Cookie;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).cookie = cookie;
    }
    return auth.onIdTokenChanged(async (snap) => {
      if (!snap) {
        // console.log("no token found...");
        setUser(null);
        cookie.remove("__session");
        cookie.set("__session", "", { path: "/" });
        return;
      }
      try {
        // console.log("updating token...");
        setLoading(true);
        const token = await snap.getIdToken();
        setUser(snap);
        cookie.remove("__session");
        cookie.set("__session", token, { path: "/" });
        setLoading(false);
        // console.log("done updating token");
      } catch (err) {
        setError(err);
      }
    });
  }, [cookie]);

  return (
    <authContext.Provider
      value={{
        user,
        loading,
        error,
        auth,
      }}
    >
      {children}
    </authContext.Provider>
  );
};

export default withCookie(AuthContextProvider);

export const useAuth = () => {
  return useContext(authContext);
};
