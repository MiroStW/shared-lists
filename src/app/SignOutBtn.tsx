"use client";

import { useClientSession } from "./sessionContext";
import { signOutHandler } from "./shared/signOutHandler";

const SignOutBtn = () => {
  const { auth } = useClientSession();

  return <button onClick={() => signOutHandler(auth)}>sign out</button>;
};

export default SignOutBtn;
