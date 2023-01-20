import { cookies } from "next/headers";
// eslint-disable-next-line import/no-unresolved
import { getAuth } from "firebase-admin/auth";
import { firebaseAdmin } from "@firebase/firebaseAdmin";

const verifyAuthToken = async () => {
  const auth = getAuth(firebaseAdmin);

  try {
    const session = cookies().get("__session");
    if (session?.value) {
      console.log("found token");
      const token = await auth.verifyIdToken(session.value);
      const { uid } = token;
      console.log("uid found: ", uid);
      const user = await auth.getUser(uid);
      return {
        auth,
        user,
      };
    }
  } catch (error: unknown) {
    if (typeof error === "string") {
      console.log("error", error);
      return {
        auth,
        error,
      };
    } else if (error instanceof Error) {
      console.log("error", error.message);

      return {
        auth,
        error: error.message,
      };
    }
  }
  return {
    auth,
  };
};

export { verifyAuthToken };
