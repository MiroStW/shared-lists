"use client";

import { useState } from "react";
import SignInEnterEmail from "./SignInEnterEmail";
import Image from "next/image";
import styles from "./signIn.module.css";

const SignInOptions = () => {
  const [email, setEmail] = useState<string>();

  return (
    <>
      <div className={styles.signInOptionsContainer}>
        {!email && (
          <>
            <h2>Sign-in options</h2>
            <br />
            <button
              className={`${styles.signInOptionButton} ${styles.signInOptionGmail}`}
            >
              <span>
                <Image
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Gmail Logo"
                  width={20}
                  height={20}
                />
              </span>
              Sign in with Google
            </button>
            <div className={styles.signInOptionsSeparator}>or</div>
          </>
        )}
        <SignInEnterEmail setEmail={setEmail} email={email} />
        {/* {email && <button onClick={() => setEmail(undefined)}>back</button>} */}
      </div>
    </>
  );
};

export default SignInOptions;
