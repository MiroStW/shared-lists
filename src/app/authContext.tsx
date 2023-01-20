"use client";

import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { firebase } from "../firebase/firebase";
import { UserRecord } from "firebase-admin/auth";
import { Cookie, withCookie } from "next-cookie";

const auth = getAuth(firebase);

// comment out this line to switch to production db
if (process.env.NEXT_PUBLIC_DEVELOPMENT === "TRUE")
  connectAuthEmulator(auth, "http://localhost:9099");

const serverAuthContext = createContext({
  user: null as UserRecord | null | undefined,
  auth,
});

const ServerAuthContextProvider = ({
  children,
  user,
  cookie,
}: {
  children: ReactNode;
  user: UserRecord;
  cookie: Cookie;
}) => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).cookie = cookie;
    }
    return auth.onIdTokenChanged(async (snap) => {
      if (!snap) {
        cookie.remove("__session");
        cookie.set("__session", "", { path: "/" });
        return;
      }
      const token = await snap.getIdToken();
      cookie.remove("__session");
      cookie.set("__session", token, { path: "/" });
    });
  }, [cookie]);

  return (
    <serverAuthContext.Provider
      value={{
        user,
        auth,
      }}
    >
      {children}
    </serverAuthContext.Provider>
  );
};

// this is a workaround as next-cookie expects a ctx object, that doesnt exist
// in next 13 anymore - to be refactored by moving to a different library or
// when next13 incorporates a new way to set cookies
const CookieWrapper = withCookie(ServerAuthContextProvider);

const CookieProvider = ({
  children,
  user,
}: {
  children: ReactNode;
  user: UserRecord;
}) => {
  const [cookie, setCookie] = useState<Cookie>();
  useEffect(() => {
    if (!cookie) setCookie(new Cookie());
  }, []);
  return (
    <>
      {cookie && (
        <CookieWrapper cookie={cookie} user={user}>
          {children}
        </CookieWrapper>
      )}
    </>
  );
};

export default CookieProvider;

export const useAuth = () => {
  return useContext(serverAuthContext);
};
