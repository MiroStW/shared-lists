"use client";

import { signOut } from "firebase/auth";
import { useClientSession } from "./sessionContext";

const SignOutBtn = () => {
  const { auth } = useClientSession();

  const signOutHandler = async () => {
    signOut(auth);
    try {
      const data = await fetch("/api/revokesession");
      const res = data.json();
      console.log("revoked session", res);
    } catch (err) {
      console.error("fetch error: ", err);
    }
  };

  return <button onClick={signOutHandler}>sign out</button>;
};

export default SignOutBtn;
