import { getAuth } from "firebase-admin/auth";
import { GetServerSidePropsContext } from "next";
import { firebaseAdmin } from "./firebaseAdmin";
import nookies from "nookies";

const verifyAuthToken = async (ctx: GetServerSidePropsContext) => {
  const auth = getAuth(firebaseAdmin);
  try {
    const cookies = nookies.get(ctx);
    if (cookies.token) {
      console.log("found token");
      const token = await getAuth(firebaseAdmin).verifyIdToken(cookies.token);
      const { uid } = token;
      console.log("uid found: ", uid);
      const user = await auth.getUser(uid);
      return {
        auth,
        user,
      };
    }
  } catch (error) {
    console.log("error", error);
    return { auth };
  }
  return { auth };
};

export { verifyAuthToken };
