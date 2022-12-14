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
        fromVerifyAuthToken: "this means token was found and verified",
      };
    }
  } catch (error) {
    console.log("error", error);
    return {
      auth,
      fromVerifyAuthToken: `this means there was an error in verifyAuthToken: ${error}`,
    };
  }
  return {
    auth,
    fromVerifyAuthToken:
      "this means cookies were loaded, but no token cookie found in verifyAuthToken",
  };
};

export { verifyAuthToken };
