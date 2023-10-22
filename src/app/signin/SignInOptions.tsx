"use client";

import { useEffect, useState } from "react";
import SignInEnterEmail from "./SignInEnterEmail";
import Image from "next/image";
import styles from "./signIn.module.css";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useClientSession } from "app/sessionContext";
import { useRouter } from "next/navigation";
import { Loading } from "app/shared/Loading";
import { FirebaseError } from "firebase/app";

const SignInOptions = () => {
  const { auth, user } = useClientSession();
  const router = useRouter();
  const [email, setEmail] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const provider = new GoogleAuthProvider();

  const signInWithGoogle = async () => {
    setIsLoading(true);
    if (crossOriginIsolated) console.log("COI is enabled");
    try {
      const { user: newUser } = await signInWithPopup(auth, provider);
      if (newUser) {
        const idToken = await newUser.getIdToken();
        const response = await fetch(`/api/sessionlogin?idToken=${idToken}`);
        const result = await response.json();
        console.log(result);
        if (!response.ok)
          throw new Error(`Session creation failed: ${response.statusText}`);
        await auth.updateCurrentUser(newUser);
      }
      setIsLoading(false);
      router.push("/lists");
    } catch (err) {
      setIsLoading(false);
      if (typeof err === "string") {
        setError(err);
      } else if (err instanceof FirebaseError) {
        setError(err.code);
      }
    }
  };

  return (
    <>
      <div className={styles.signInOptionsContainer}>
        {isLoading ? (
          <div style={{ margin: "auto" }}>
            <Loading inline={true} />
          </div>
        ) : (
          <>
            {!email && (
              <>
                <h2>Sign-in options</h2>
                <br />
                <button
                  className={`${styles.signInOptionButton} ${styles.signInOptionGmail}`}
                  onClick={signInWithGoogle}
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
          </>
        )}
        {error && <div>Error: {error}</div>}
      </div>
    </>
  );
};

export default SignInOptions;
