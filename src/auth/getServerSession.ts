import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

export const getAdminAuth = () => {
  if (!firebaseAdmin) {
    throw new Error("Firebase Admin not initialized");
  }
  return getAuth(firebaseAdmin);
};

const getServerSession = async () => {
  const sessionCookie = (await cookies()).get("__session")?.value;
  if (sessionCookie) {
    try {
      const { uid } = await getAdminAuth().verifySessionCookie(sessionCookie);
      if (uid) {
        const user = await getAdminAuth().getUser(uid);

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
