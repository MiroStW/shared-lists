"use client";

import {
  connectAuthEmulator,
  getAuth,
  inMemoryPersistence,
  setPersistence,
} from "firebase/auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { firebase } from "../firebase/firebase";
import type { UserRecord } from "firebase-admin/auth";
import { Cookie, withCookie } from "next-cookie";
import { RequestCookie } from "next/dist/server/web/spec-extension/cookies";

const auth = getAuth(firebase);
setPersistence(auth, inMemoryPersistence);

// comment out this line to switch to production db
if (process.env.NEXT_PUBLIC_DEVELOPMENT === "TRUE")
  connectAuthEmulator(auth, "http://localhost:9099");

const serverAuthContext = createContext({
  user: null as UserRecord | null | undefined,
  auth,
  loading: true,
  // csrfToken: undefined as RequestCookie | undefined,
});

const ServerAuthContextProvider = ({
  children,
  user,
}: // cookie,
{
  children: ReactNode;
  user?: UserRecord;
  // cookie: Cookie;
}) => {
  const [loading, setLoading] = useState(false);
  // const [csrfToken, setCsrfToken] = useState<RequestCookie | undefined>();

  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     (window as any).cookie = cookie;
  //   }

  //   console.log("user in authContext: ", user);
  //   const unsubscribe = auth.onIdTokenChanged(async (snap) => {
  //     setLoading(true);
  //     if (!snap) {
  //       cookie.remove("__session");
  //       cookie.set("__session", "", { path: "/" });
  //       return;
  //     }
  //     const token = await snap.getIdToken();
  //     // console.log("auth token verified/refreshed at: ", new Date());
  //     cookie.remove("__session");
  //     cookie.set("__session", token, { path: "/" });
  //     setLoading(false);
  //   });
  //   return unsubscribe;
  // }, [cookie]);

  return (
    <serverAuthContext.Provider
      value={{
        user,
        auth,
        loading,
        // csrfToken,
      }}
    >
      {children}
    </serverAuthContext.Provider>
  );
};

// this is a workaround as next-cookie expects a ctx object, that doesnt exist
// in next 13 anymore - to be refactored by moving to a different library or
// when next13 incorporates a new way to set cookies
// const CookieWrapper = withCookie(ServerAuthContextProvider);

// const CookieProvider = ({
//   children,
//   user,
// }: {
//   children: ReactNode;
//   user?: UserRecord;
// }) => {
//   const [cookie, setCookie] = useState<Cookie>();
//   useEffect(() => {
//     if (!cookie) setCookie(new Cookie());
//   }, []);
//   return (
//     <>
//       {cookie && (
//         <CookieWrapper cookie={cookie} user={user}>
//           {children}
//         </CookieWrapper>
//       )}
//     </>
//   );
// };

export default ServerAuthContextProvider;

export const useAuth = () => {
  return useContext(serverAuthContext);
};
