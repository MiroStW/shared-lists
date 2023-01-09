"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/authContext";

const SignOutBtn = () => {
  const { auth } = useAuth();
  const router = useRouter();

  return (
    <button onClick={() => signOut(auth).then(() => router.push("/"))}>
      logout
    </button>
  );
};

export default SignOutBtn;
