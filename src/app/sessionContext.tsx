"use client";

import {
  connectAuthEmulator,
  getAuth,
  signInWithCustomToken,
  User,
} from "firebase/auth";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { firebase } from "../firebase/firebase";


export const auth = getAuth(firebase);
// auth.setPersistence(browserLocalPersistence);

// comment out this line to switch to production db
if (process.env.NEXT_PUBLIC_DEVELOPMENT === "TRUE")
  connectAuthEmulator(auth, "http://localhost:9099");

const sessionContext = createContext({
  user: undefined as User | undefined,
  auth,
});

export const SessionContextProvider = ({
  children,
  // cookie,
}:PropsWithChildren
  // {
  // customToken?: string;
  // expirationDateStr?: string;
  // cookie: Cookie;
  // }
) => {
  const [user, setUser] = useState<User>();
  // const session = useSession();

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

    // if (typeof window !== "undefined") {
    //   (window as any).cookie = cookie;
    // }
    const unsubscribe = auth.onAuthStateChanged(async (userSnapshot) => {
      // setLoading(true);
      if (userSnapshot) {
        userSnapshot?.getIdToken();
        setUser(userSnapshot);
      } else {
        // check if user is logged in on next-auth

        try {
          const data = await fetch("/api/fbauth");
          const res = await data.json();
          const signedInUser = await signInWithCustomToken(auth, res.token);
          setUser(signedInUser.user);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("fetch error: ", err);
        }

      }
    });

    return unsubscribe;
  }, []);

  return (
    <sessionContext.Provider
      value={{
        user,
        auth,
      }}
    >
      {children}
    </sessionContext.Provider>
  );
};

// this is a workaround as next-cookie expects a ctx object, that doesnt exist
// in next 13 anymore - to be refactored by moving to a different library or
// when next13 incorporates a new way to set cookies
// const CookieWrapper = withCookie(AuthContextProvider);

// const CookieProvider = ({ children }: { children: ReactNode }) => {
//   const [cookie, setCookie] = useState<Cookie>();
//   useEffect(() => {
//     if (!cookie) setCookie(new Cookie());
//   }, []);
//   return (
//     <>{cookie && <CookieWrapper cookie={cookie}>{children}</CookieWrapper>}</>
//   );
// };

// export default CookieProvider;

export const useClientSession = () => {
  return useContext(sessionContext);
};
