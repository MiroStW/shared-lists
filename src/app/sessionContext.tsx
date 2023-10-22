"use client";

import {
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  signInWithCustomToken,
  signOut,
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
// only persist client-side auth state in bwoser session, it is already
// persisted in the long-lived server session
auth.setPersistence(browserSessionPersistence);

// comment out this line to switch to production db
if (process.env.NEXT_PUBLIC_DEVELOPMENT === "TRUE")
  connectAuthEmulator(auth, "http://localhost:9099");

const sessionContext = createContext({
  user: undefined as User | undefined,
  auth,
  isLoading: false,
});

export const SessionContextProvider = (
  {
    children, // cookie,
  }: PropsWithChildren
  // {
  // customToken?: string;
  // expirationDateStr?: string;
  // cookie: Cookie;
  // }
) => {
  const [user, setUser] = useState<User>();
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);
      try {
        // right now this endpoint is called on every page load. this is not
        // ideal, there could be a 2nd endpoint to only check if the session is
        // valid
        const data = await fetch("/api/clientauth");
        console.log("response from clientauth: ", data.statusText);
        const { token } = await data.json();

        if (!token) {
          console.log("sessionContext: no token found");
          // sign out user if no valid server session exists
          await signOut(auth);
          setUser(undefined);
        } else if (userSnapshot) {
          // sign in from cache
          userSnapshot?.getIdToken();
          setUser(userSnapshot);
          console.log("revalidated user from cache: ", userSnapshot);
        } else {
          // sign in from custom token
          console.log("use custom token to sign in user");

          const signedInUser = await signInWithCustomToken(auth, token);
          console.log("signed in user: ", signedInUser);
          setUser(signedInUser.user);
        }
      } catch (err) {
        console.error("fetch error: ", err);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    setIsLoading(false);
  }, [user]);

  return (
    <sessionContext.Provider
      value={{
        user,
        auth,
        isLoading,
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
