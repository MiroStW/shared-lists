import { getAuth } from "firebase-admin/auth";
import { GetServerSidePropsContext } from "next";
import { firebaseAdmin } from "./firebaseAdmin";
import nookies from "nookies";

const verifyAuthToken = async (ctx: GetServerSidePropsContext) => {
  try {
    const cookies = nookies.get(ctx);
    if (cookies.token) {
      const token = await getAuth(firebaseAdmin).verifyIdToken(cookies.token);
      const { uid } = token;
      const user = await getAuth(firebaseAdmin).getUser(uid);
      const serializedUser = JSON.stringify(user);

      return {
        serializedUser,
      };
    }
  } catch (error) {
    // DOESN'T WORK YET? not supposed to happen on "/" route,maybe add parameter to redirect to login page
    // if (ctx.req.url !== "/login") {
    //   ctx.res.writeHead(302, { Location: "/login" });
    //   ctx.res.end();
    // }
    return {};
  }
  return {};
};

export { verifyAuthToken };
