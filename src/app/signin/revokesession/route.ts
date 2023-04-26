import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

const GET = async () => {
  const sessionCookie = cookies().get("__session")?.value || "";

  try {
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie);

    getAuth().revokeRefreshTokens(decodedClaims.uid);
  } catch (error) {
    return new Response("error", {
      status: 401,
      statusText: `Unknown error: ${error}`,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("session revoked", {
    headers: {
      "Set-Cookie": `__session=; Path=/; Max-Age=0; httpOnly; secure`,
    },
  });
};

export { GET };
