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

import { useSession } from "next-auth/react";

export const auth = getAuth(firebase);
// auth.setPersistence(browserLocalPersistence);

// comment out this line to switch to production db
if (process.env.NEXT_PUBLIC_DEVELOPMENT === "TRUE")
  connectAuthEmulator(auth, "http://localhost:9099");

const authContext = createContext({
  fbUser: undefined as User | undefined,
  auth,
});

export const AuthContextProvider = ({
  children,
  // cookie,
}:PropsWithChildren
  // {
  // customToken?: string;
  // expirationDateStr?: string;
  // cookie: Cookie;
  // }
) => {
  const [fbUser, setFbUser] = useState<User>();
  const session = useSession();

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
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // setLoading(true);
      if (user) {
        user?.getIdToken();
        setFbUser(user);
      } else if (session.data?.user) {
        // check if user is logged in on next-auth

        try {
          const data = await fetch("/api/fbauth", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({userId: session.data.user.id}) ,
          });
          const res = await data.json();
          const signedInUser = await signInWithCustomToken(auth, res.token);
          setFbUser(signedInUser.user);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("fetch error: ", err);
        }

      }
    });

    return unsubscribe;
  }, [session.data?.user]);

  return (
    <authContext.Provider
      value={{
        fbUser,
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

export const useAuth = () => {
  return useContext(authContext);
};
