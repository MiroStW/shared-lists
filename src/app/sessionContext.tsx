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
// only persist client-side auth state in browser session, it is already
// persisted in the long-lived server session
auth.setPersistence(browserSessionPersistence);

// comment out this line to switch to production db
if (process.env.NEXT_PUBLIC_DEVELOPMENT === "TRUE")
  connectAuthEmulator(auth, "http://localhost:9099");

export const sessionContext = createContext({
  user: undefined as User | undefined,
  auth,
  isLoading: false,
});

export const SessionContextProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (userSnapshot) => {
      setIsLoading(true);
      try {
        // right now this endpoint is called on every page load. this is not
        // ideal, there could be a 2nd endpoint to only check if the session is
        // valid
        const data = await fetch("/api/clientauth");
        const { token } = await data.json();

        if (!token) {
          // sign out user if no valid server session exists
          await signOut(auth);
          setUser(undefined);
        } else if (userSnapshot) {
          // sign in from cache
          userSnapshot?.getIdToken();
          setUser(userSnapshot);
        } else {
          // sign in from custom token

          const signedInUser = await signInWithCustomToken(auth, token);
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

export const useClientSession = () => {
  return useContext(sessionContext);
};
