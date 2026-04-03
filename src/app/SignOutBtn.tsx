"use client";

import { signOut } from "next-auth/react";

const SignOutBtn = () => {
  return <button onClick={() => signOut()}>sign out</button>;
};

export default SignOutBtn;
