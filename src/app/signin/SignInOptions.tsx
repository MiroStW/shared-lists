"use client";

import { useState } from "react";
import SignInWithEmail from "./SignInWithEmail";

const SignInOptions = () => {
  const [signInOption, setSignInOption] = useState<"email" | "google">();

  return (
    <>
      {signInOption === "email" && <SignInWithEmail />}
      {signInOption === "google" && <div>Sign in with Google</div>}
      {signInOption === undefined && (
        <>
          <div className="sign-in-options">
            <button
              className="sign-in-option"
              onClick={() => setSignInOption("email")}
            >
              Sign in with email
            </button>
          </div>

          <div className="sign-in-options">
            <button
              className="sign-in-option"
              onClick={() => setSignInOption("google")}
            >
              Sign in with Google
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default SignInOptions;
