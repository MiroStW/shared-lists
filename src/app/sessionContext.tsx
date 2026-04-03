"use client";

import { useSession, SessionProvider } from "next-auth/react";
import { PropsWithChildren } from "react";

export const SessionContextProvider = ({ children }: PropsWithChildren) => {
  return <SessionProvider>{children}</SessionProvider>;
};

export const useClientSession = () => {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isLoading: status === "loading",
    status,
  };
};
