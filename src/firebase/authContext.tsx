import { getAuth, User } from "firebase/auth";
import { createContext, ReactNode, useContext } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { firebase } from "./firebase";

const auth = getAuth(firebase);

const authContext = createContext({
  user: null as User | null | undefined,
  loading: true,
  error: undefined as Error | undefined,
  auth,
});

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, loading, error] = useAuthState(auth);
  // const [user, setUser] = useState<User | null>(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<Error | null>(null);

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
    <authContext.Provider value={{ user, loading, error, auth }}>
      {children}
    </authContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(authContext);
};