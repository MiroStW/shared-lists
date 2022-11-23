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
// import { useAuthState } from "react-firebase-hooks/auth";

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
  // const [user, loading, error] = useAuthState(auth);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    return auth.onIdTokenChanged(async (user) => {
      if (!user) {
        setUser(null);
        nookies.set(undefined, "token", "", { path: "/" });
      } else {
        try {
          setLoading(true);
          const token = await user.getIdToken();
          setUser(user);
          nookies.set(undefined, "token", token, { path: "/" });
          setLoading(false);
        } catch (err) {
          setError(err);
        }
      }
    });
  }, []);

  // useEffect(() => {
  //   setLoading(true);
  //   let unsubscribe: Unsubscribe;
  //   try {
  //     unsubscribe = auth.onAuthStateChanged((currentuser: User | null) => {
  //       if (currentuser) {
  //         setUser(currentuser);
  //       }
  //     });
  //   } catch (err) {
  //     if (err instanceof Error) setError(err);
  //     else throw err;
  //   }
  //   setLoading(false);
  //   return () => unsubscribe();
  // }, [user]);

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
