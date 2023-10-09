import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const GET = async () => {
  const cookie = cookies().get("__session")?.value;

  if (!cookie) {
    return NextResponse.json({ message: "no token provided" }, { status: 200 });
  }

  try {
    const { sessionCookie } = JSON.parse(cookie);
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie);

    getAuth().revokeRefreshTokens(decodedClaims.uid);
  } catch (error) {
    return NextResponse.json(`Unknown error: ${error}`, {
      status: 401,
    });
  }
  cookies().delete("__session");
  return NextResponse.json("session revoked", { status: 200 });
};

export { GET };
