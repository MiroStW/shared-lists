"use client";

import { signIn } from "next-auth/react";

const SignInBtn = () => (
  <button onClick={() => signIn(undefined, { callbackUrl: "/" })}>
    sign in
  </button>
);

export default SignInBtn;
