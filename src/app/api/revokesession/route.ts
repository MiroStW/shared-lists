import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const GET = async () => {
  const sessionCookie = cookies().get("__session")?.value;

  if (!sessionCookie) {
    return NextResponse.json({ message: "no token provided" }, { status: 200 });
  }

  try {
    const decodedToken =
      await getAuth(firebaseAdmin).verifySessionCookie(sessionCookie);

    await getAuth().revokeRefreshTokens(decodedToken.uid);
  } catch (error) {
    return NextResponse.json(`Unknown error: ${error}`, {
      status: 401,
    });
  }
  cookies().delete("__session");
  return NextResponse.json("session revoked", { status: 200 });
};

export { GET };
