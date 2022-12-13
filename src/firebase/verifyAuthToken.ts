import { getAuth } from "firebase-admin/auth";
import { GetServerSidePropsContext } from "next";
import { firebaseAdmin } from "./firebaseAdmin";
import nookies from "nookies";

const verifyAuthToken = async (ctx: GetServerSidePropsContext) => {
  const auth = getAuth(firebaseAdmin);
  try {
    const cookies = nookies.get(ctx);
    if (cookies.__session) {
      console.log("found token");
      const token = await getAuth(firebaseAdmin).verifyIdToken(
        cookies.__session
      );
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
