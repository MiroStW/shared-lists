import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

export const adminAuth = getAuth(firebaseAdmin);

const getServerSession = async () => {
  const sessionCookie = cookies().get("__session")?.value;
  if (sessionCookie) {
    try {
      const { uid } = await adminAuth.verifySessionCookie(sessionCookie);
      if (uid) {
        const user = await adminAuth.getUser(uid);

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
