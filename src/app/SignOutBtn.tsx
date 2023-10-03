"use client";

import { signOut } from "firebase/auth";
import { useClientSession } from "./sessionContext";


const SignOutBtn = () => {
  const { auth } = useClientSession();

  return <button onClick={() => signOut(auth)}>sign out</button>
};

export default SignOutBtn;
