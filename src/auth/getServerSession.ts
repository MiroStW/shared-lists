import { getServerSession as getNextAuthSession } from "next-auth/next";
import { authOptions } from "./authOptions";

export const getServerSession = async () => {
  const session = await getNextAuthSession(authOptions);
  if (session?.user) {
    return { user: session.user };
  }
  return { error: "No user found" };
};

export default getServerSession;
