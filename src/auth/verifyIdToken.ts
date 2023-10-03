import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

const verifyIdToken = async () => {
  const auth = getAuth(firebaseAdmin);

  try {
    const session = cookies().get("__session")?.value;
    if (session) {
      const { uid } = await auth.verifySessionCookie(session);
      const user = await auth.getUser(uid);
      return { user };
    }
  } catch (error) {
    console.log(error);
    return { user: undefined };
  }
  return { user: undefined };
};

export default verifyIdToken;
