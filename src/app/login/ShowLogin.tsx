"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { uiConfig } from "@firebase/firebaseAuthUI.config";
import { useAuth } from "../authContext";
import "firebaseui/dist/firebaseui.css";

const ShowLogin = () => {
  const { auth } = useAuth();

  // interface Props {
  //   // The Firebase UI Web UI Config object.
  //   // See: https://github.com/firebase/firebaseui-web#configuration
  //   uiConfig: auth.Config;
  //   // Callback that will be passed the FirebaseUi instance before it is
  //   // started. This allows access to certain configuration options such as
  //   // disableAutoSignIn().
  //   uiCallback?(ui: auth.AuthUI): void;
  //   // The Firebase App auth instance to use.
  //   firebaseAuth: any; // As firebaseui-web
  //   className?: string;
  // }

  const [firebaseui, setFirebaseui] = useState<
    typeof import("firebaseui") | null
  >(null);
  const [userSignedIn, setUserSignedIn] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    // Firebase UI only works on the Client. So we're loading the package only after
    // the component has mounted, so that this works when doing server-side rendering.
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    setFirebaseui(require("firebaseui"));
  }, []);

  useEffect(() => {
    if (firebaseui === null) return;

    if (uiConfig()) {
      // Get or Create a firebaseUI instance.
      const firebaseUiWidget =
        firebaseui.auth.AuthUI.getInstance() ||
        new firebaseui.auth.AuthUI(auth);
      if (uiConfig().signInFlow === "popup") firebaseUiWidget.reset();

      // We track the auth state to reset firebaseUi if the user signs out.
      const unregisterAuthObserver = onAuthStateChanged(auth, (user) => {
        if (!user && userSignedIn) firebaseUiWidget.reset();
        setUserSignedIn(!!user);
      });

      // Trigger the callback if any was set.
      // if (uiCallback) uiCallback(firebaseUiWidget);

      // Render the firebaseUi Widget.
      firebaseUiWidget.start(
        elementRef.current as unknown as Element,
        uiConfig()
      );

      // eslint-disable-next-line consistent-return
      return () => {
        unregisterAuthObserver();
        firebaseUiWidget.reset();
      };
    }
  }, [auth, firebaseui, userSignedIn]);

  return (
    <>
      <div>
        <div>
          <h1>Log in</h1>
        </div>
        <div ref={elementRef} />
      </div>
    </>
  );
};

export default ShowLogin;
