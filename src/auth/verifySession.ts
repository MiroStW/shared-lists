import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

const verifySession = async () => {
  const cookie = cookies().get("__session")?.value;

  if (cookie) {
    const {
      sessionCookie,
      expirationDate,
    }: { sessionCookie: string; expirationDate: string } = JSON.parse(cookie);
    // const sessionCookie = request.cookies.get("__session") || "";
    try {
      const auth = getAuth(firebaseAdmin);
      const { uid } = await auth.verifySessionCookie(sessionCookie);
      if (uid) {
        const customToken = await auth.createCustomToken(uid);
        const user = await getAuth().getUser(uid);

        return { user, customToken, expirationDate };
      }
    } catch (error) {
      return { error };
    }
  }
  return { error: "No user found" };
};

export { verifySession };
