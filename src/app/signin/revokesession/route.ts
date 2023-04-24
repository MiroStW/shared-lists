import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

const GET = async () => {
  console.log("revokesession called");
  const sessionCookie = cookies().get("__session")?.value || "";

  try {
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie);

    getAuth().revokeRefreshTokens(decodedClaims.uid);

    console.log("token revoked");
  } catch (error) {
    console.log("error revoking token: ", error);
  }

  return new Response("session revoked", {
    headers: {
      "Set-Cookie": `__session=; Path=/; Max-Age=0; httpOnly; secure`,
    },
  });
};

export { GET };
