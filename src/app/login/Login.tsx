"use client";

import { uiConfig } from "../../firebase/firebaseAuthUI.config";
import AuthUi from "./AuthUi";
import { useAuth } from "../context/authContext";

const Login = () => {
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

export default Login;
