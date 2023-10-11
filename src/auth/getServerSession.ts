import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

const getServerSession = async () => {
  const sessionCookie = cookies().get("__session")?.value;
  if (sessionCookie) {
    // const sessionCookie = request.cookies.get("__session") || "";
    try {
      // console.log("auth: ", auth);
      // const { uid } = await auth.verifyIdToken(sessionCookie);
      const { uid } =
        await getAuth(firebaseAdmin).verifySessionCookie(sessionCookie);
      if (uid) {
        // const customToken = await auth.createCustomToken(uid);
        const user = await getAuth().getUser(uid);

        return { user };
      }
    } catch (error) {
      console.log("verifySession error: ", error);
      return { error };
    }
  }
  return { error: "No user found" };
};

export default getServerSession;
