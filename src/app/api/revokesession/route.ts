import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const GET = async (request: NextRequest) => {
  const sessionCookie = cookies().get("__session")?.value;

  if (!sessionCookie) {
    return NextResponse.json({ message: "no token provided" }, { status: 200 });
  }

  cookies().delete("__session");

  try {
    const decodedToken =
      await getAuth(firebaseAdmin).verifySessionCookie(sessionCookie);

    await getAuth().revokeRefreshTokens(decodedToken.uid);
  } catch (error) {
    return NextResponse.json(`Unknown error: ${error}`, {
      status: 401,
    });
  }

  // force refresh to clear sessionStorage & cookie
  return NextResponse.redirect(request.headers.get("referer") || "/");
};

export { GET };
