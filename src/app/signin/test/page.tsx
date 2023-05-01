"use client";

import { useAuth } from "app/authContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";

const Test = () => {
  const [result, setResult] = useState<any>(null);

  const { auth } = useAuth();

  const sendRequest = async () => {
    // const cred = await signInWithEmailAndPassword(
    //   auth,
    //   "miro@miro-wilms.de",
    //   "123456"
    // );

    // const idToken = await cred.user.getIdToken();

    const res = await fetch("/api/sessionlogin");
    const resText = await res.text();
    console.log(res);
    setResult(resText);
  };

  return (
    <div>
      <h1>Test</h1>
      <button onClick={sendRequest}>send request</button>
      <pre>{result}</pre>
    </div>
  );
};

export default Test;
