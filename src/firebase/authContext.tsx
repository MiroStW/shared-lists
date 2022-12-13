import { connectAuthEmulator, getAuth, User } from "firebase/auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { firebase } from "./firebase";
import nookies from "nookies";
import { useRouter } from "next/router";

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

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).nookies = nookies;
    }
    return auth.onIdTokenChanged(async (snap) => {
      if (!snap) {
        // console.log("no token found...");
        setUser(null);
        nookies.destroy(null, "token");
        nookies.set(null, "token", "", { path: "/" });
        router.push("/login");
        return;
      }
      try {
        // console.log("updating token...");
        setLoading(true);
        const token = await snap.getIdToken();
        setUser(snap);
        nookies.destroy(null, "token");
        nookies.set(null, "token", token, { path: "/" });
        setLoading(false);
        // console.log("done updating token");
      } catch (err) {
        setError(err);
      }
    });
  }, []);

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

export const useAuth = () => {
  return useContext(authContext);
};
