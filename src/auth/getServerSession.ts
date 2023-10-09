import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

const getServerSession = async () => {
  const cookie = cookies().get("__session")?.value;
  if (cookie) {
    const sessionCookie = JSON.parse(cookie).sessionCookie as string;
    const expirationDate = JSON.parse(cookie).expirationDate as string;
    // const sessionCookie = request.cookies.get("__session") || "";
    try {
      const auth = getAuth(firebaseAdmin);
      // console.log("auth: ", auth);
      // const { uid } = await auth.verifyIdToken(sessionCookie);
      const { uid } = await auth.verifySessionCookie(sessionCookie);
      if (uid) {
        // const customToken = await auth.createCustomToken(uid);
        const user = await getAuth().getUser(uid);

        return { user, expirationDate };
      }
    } catch (error) {
      console.log("verifySession error: ", error);
      return { error };
    }
  }
  return { error: "No user found" };
};

export default getServerSession;
