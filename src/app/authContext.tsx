"use client";

import {
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
} from "react";
import { firebase } from "../firebase/firebase";
import type { UserRecord } from "firebase-admin/auth";
import { setSessionCookie } from "auth/setSessionCookie";

const auth = getAuth(firebase);
auth.setPersistence(browserSessionPersistence);

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
  customToken,
  expirationDateStr,
}: // cookie,
{
  children: ReactNode;
  user?: UserRecord;
  customToken?: string;
  expirationDateStr?: string;
  // cookie: Cookie;
}) => {
  const refreshSession = useCallback(
    async (clientUser: User | null) => {
      if (!expirationDateStr || !clientUser) return;

      const today = new Date().getTime();
      const expirationDate = new Date(expirationDateStr).getTime();
      const differenceInDays = Math.floor(
        (expirationDate - today) / (1000 * 60 * 60 * 24)
      );
      if (differenceInDays < 4) {
        const idToken = await clientUser.getIdToken();
        await setSessionCookie(idToken);
      }
    },
    [expirationDateStr]
  );

  useEffect(() => {
    if (customToken && expirationDateStr) {
      auth.onAuthStateChanged(async (clientUser) => {
        if (!clientUser && customToken)
          await signInWithCustomToken(auth, customToken);

        await refreshSession(clientUser);
      });
    }
  }, [customToken, expirationDateStr, refreshSession]);

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

export default ServerAuthContextProvider;

export const useAuth = () => {
  return useContext(serverAuthContext);
};
