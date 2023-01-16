"use client";

import { connectAuthEmulator, getAuth, User } from "firebase/auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Cookie, withCookie } from "next-cookie";
import { firebase } from "../../firebase/firebase";

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

// this is a workaround as next-cookie expects a ctx object, that doesnt exist
// in next 13 anymore - to be refactored by moving to a different library or
// when next13 incorporates a new way to set cookies
const CookieWrapper = withCookie(AuthContextProvider);

const CookieProvider = ({ children }: { children: ReactNode }) => {
  const [cookie, setCookie] = useState<Cookie>();
  useEffect(() => {
    if (!cookie) setCookie(new Cookie());
  }, []);
  return (
    <>{cookie && <CookieWrapper cookie={cookie}>{children}</CookieWrapper>}</>
  );
};

export default CookieProvider;

export const useAuth = () => {
  return useContext(authContext);
};
