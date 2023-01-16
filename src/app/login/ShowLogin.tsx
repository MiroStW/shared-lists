"use client";

import { uiConfig } from "../../firebase/firebaseAuthUI.config";
import AuthUi from "./AuthUi";
import { useAuth } from "./authContext";

const ShowLogin = () => {
  const { auth } = useAuth();
  return (
    <>
      <div>
        <div>
          <h1>Log in</h1>
        </div>
        <AuthUi firebaseAuth={auth} uiConfig={uiConfig()} />
      </div>
    </>
  );
};

export default ShowLogin;
