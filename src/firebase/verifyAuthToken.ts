import { getAuth } from "firebase-admin/auth";
import { GetServerSidePropsContext } from "next";
import { firebaseAdmin } from "./firebaseAdmin";
import cookies from "next-cookies";

const verifyAuthToken = async (ctx: GetServerSidePropsContext) => {
  const auth = getAuth(firebaseAdmin);
  try {
    const c = cookies(ctx);
    if (c.__session) {
      console.log("found token");
      const token = await getAuth(firebaseAdmin).verifyIdToken(c.__session);
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
    return {
      auth,
    };
  }
  return {
    auth,
  };
};

export { verifyAuthToken };
