"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import SignInEnterEmail from "./SignInEnterEmail";
import styles from "./signIn.module.css";

const SignInOptions = () => {
  const [email, setEmail] = useState<string>();

  return (
    <>
      <div className={styles.signInOptionsContainer}>
        <h2>Sign-in</h2>
        <br />
        <button 
          onClick={() => signIn("google")}
          className={`${styles.signInOptionButton} ${styles.signInOptionGmail}`}
        >
          Sign in with Google
        </button>
        <div className={styles.signInOptionsSeparator}>
          <span>or</span>
        </div>
        <SignInEnterEmail setEmail={setEmail} email={email} />
      </div>
    </>
  );
};

export default SignInOptions;
