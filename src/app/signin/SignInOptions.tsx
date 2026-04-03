"use client";

import { useState } from "react";
import SignInEnterEmail from "./SignInEnterEmail";
import styles from "./signIn.module.css";

const SignInOptions = () => {
  const [email, setEmail] = useState<string>();

  return (
    <>
      <div className={styles.signInOptionsContainer}>
        <h2>Sign-in</h2>
        <br />
        <SignInEnterEmail setEmail={setEmail} email={email} />
      </div>
    </>
  );
};

export default SignInOptions;
