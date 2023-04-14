"use client";

import { useState } from "react";
import SignInEnterEmail from "./SignInEnterEmail";

const SignInOptions = () => {
  const [signInOption, setSignInOption] = useState<"email" | "google">();

  return (
    <>
      <div className="sign-in-options">
        {signInOption !== "email" && (
          <button
            className="sign-in-option"
            onClick={() => setSignInOption("google")}
          >
            Sign in with Google
          </button>
        )}

        <SignInEnterEmail setSignInOption={setSignInOption} />
      </div>
    </>
  );
};

export default SignInOptions;
