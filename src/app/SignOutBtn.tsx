"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "./authContext";

const SignOutBtn = () => {
  const { auth } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/signin/revokesession");
    await signOut(auth);
    router.push("/signin");
  };

  return <button onClick={handleSignOut}>logout</button>;
};

export default SignOutBtn;
