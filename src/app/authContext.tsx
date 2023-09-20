"use client";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  signInWithCustomToken,
  User,
} from "firebase/auth";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { firebase } from "../firebase/firebase";
import type { UserRecord } from "firebase-admin/auth";
import { setSessionCookie } from "auth/setSessionCookie";
import { Cookie, withCookie } from "next-cookie";

const auth = getAuth(firebase);
auth.setPersistence(browserLocalPersistence);

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
  user?: UserRecord;
  // customToken?: string;
  // expirationDateStr?: string;
  cookie: Cookie;
}) => {
  // const refreshSession = useCallback(
  //   async (clientUser: User | null) => {
  //     if (!expirationDateStr || !clientUser) return;

  //     const today = new Date().getTime();
  //     const expirationDate = new Date(expirationDateStr).getTime();
  //     const differenceInDays = Math.floor(
  //       (expirationDate - today) / (1000 * 60 * 60 * 24)
  //     );
  //     if (differenceInDays < 4) {
  //       const idToken = await clientUser.getIdToken();
  //       await setSessionCookie(idToken);
  //     }
  //   },
  //   [expirationDateStr]
  // );

  // useEffect(() => {
  //   if (customToken && expirationDateStr) {
  //     auth.onAuthStateChanged(async (clientUser) => {
  //       if (!clientUser && customToken)
  //         await signInWithCustomToken(auth, customToken);

  //       await refreshSession(clientUser);
  //     });
  //   }
  // }, [customToken, expirationDateStr, refreshSession]);

  useEffect(() => {
    console.log("cookie: ", cookie);
    if (typeof window !== "undefined") {
      (window as any).cookie = cookie;
    }
    const unsubscribe = auth.onIdTokenChanged(async (snap) => {
      // setLoading(true);
      if (!snap) {
        cookie.remove("__session");
        cookie.set("__session", "", { path: "/" });
        return;
      }
      const token = await snap.getIdToken();

      // console.log("auth token verified/refreshed at: ", new Date());
      cookie.remove("__session");
      cookie.set("__session", token, { path: "/" });
      // setLoading(false);
    });
    return unsubscribe;
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
  user?: UserRecord;
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
