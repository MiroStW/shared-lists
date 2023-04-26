"use client";

import { useAuth } from "app/authContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";

const Test = () => {
  const [result, setResult] = useState<any>(null);

  const { auth } = useAuth();

  const sendRequest = async () => {
    const cred = await signInWithEmailAndPassword(
      auth,
      "miro@miro-wilms.de",
      "123456"
    );

    const idToken = await cred.user.getIdToken();

    const res = await fetch("http://localhost:3000/signin/sessionlogin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        csrfToken: "test",
        idToken,
      }),
    });
    const { status } = res;
    setResult(status);
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
