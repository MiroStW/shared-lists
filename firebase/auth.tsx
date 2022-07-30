import "./firebase.js";
import {
  connectAuthEmulator,
  getAuth,
  NextOrObserver,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import * as firebaseui from "firebaseui";
import "firebaseui/dist/firebaseui.css";
import { uiConfig } from "./firebaseAuthUI.config.js/index.js";
import { useCallback, useEffect, useState } from "react";
import { auth } from "./firebase.js";

const firebaseUi =
  firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);

const FirebaseUiLogin = (config: firebaseui.auth.Config) => {
  // comment out this line to switch to production db
  // connectAuthEmulator(auth, "http://localhost:9099");
  const loadFirebaseui = useCallback(async () => {
    const firebaseui = await import("firebaseui");
    const firebaseUi =
      firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);

    firebaseUi.start("#firebaseui-auth-container", config);
  }, [auth, config]);

  useEffect(() => {
    loadFirebaseui();
  }, []);

  return <div id="firebaseui-auth-container"></div>;
};

// const fbAuthUi = new firebaseui.auth.AuthUI(auth);

// interface AuthUserProps {
//   onUserLoggedIn: () => void;
//   onUserLoggedOut: () => void;
// }

// const authUser = ({ onUserLoggedIn, onUserLoggedOut }: AuthUserProps) => {
//   onAuthStateChanged(auth, (user) => {
//     if (user) {
//       // console.log(user);
//       console.log(auth);
//       onUserLoggedIn();
//     } else {
//       fbAuthUi.start("#firebaseui-auth-container", uiConfig);
//       onUserLoggedOut();
//     }
//   });
// };

// export { auth, authUser };

interface FormatedUser {
  uid: string;
  email: string | null;
}

const formatAuthUser = (user: User) => ({
  uid: user.uid,
  email: user.email,
});

export default function useFirebaseAuth() {
  const [authUser, setAuthUser] = useState<FormatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  const authStateChanged: NextOrObserver<User | null> = async (authState) => {
    if (!authState) {
      setAuthUser(null);
      setLoading(false);
      firebaseUi.start("#firebaseui-auth-container", uiConfig);
      return;
    }

    setLoading(true);
    var formattedUser = formatAuthUser(authState);
    setAuthUser(formattedUser);
    setLoading(false);
  };

  // listen for Firebase state change
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(authStateChanged);
    return () => unsubscribe();
  }, []);

  return {
    authUser,
    loading,
  };
}
