import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

const verifySession = async () => {
  const sessionCookie = cookies().get("__session")?.value || "";
  // const sessionCookie = request.cookies.get("__session") || "";
  try {
    const { uid } = await getAuth(firebaseAdmin).verifySessionCookie(
      sessionCookie
    );
    const user = await getAuth().getUser(uid);
    // console.log("user in verifySessionCookie: ", user.email);
    // console.log("user in verifySession: ", uid);
    // console.log("session in verifySession: ", sessionCookie);
    return { user };
  } catch (error) {
    console.log(error);
    return { error };
  }
};

export { verifySession };
