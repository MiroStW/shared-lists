"use client";

import Link from "next/link";

// import { signIn } from "next-auth/react";

const SignInBtn = () => (
  <Link href="/signin">
  <button>
    sign in
    </button>
  </Link>
);

export default SignInBtn;
