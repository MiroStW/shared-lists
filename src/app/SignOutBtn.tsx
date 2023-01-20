"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "./authContext";

const SignOutBtn = () => {
  const { auth } = useAuth();
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await signOut(auth);
        router.push("/");
      }}
    >
      logout
    </button>
  );
};

export default SignOutBtn;
