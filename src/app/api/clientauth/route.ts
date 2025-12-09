import { getAdminAuth } from "auth/getServerSession";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const handler = async () => {
  const sessionCookie = (await cookies()).get("__session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ message: "no token provided" }, { status: 200 });
  }

  // validate cookie
  try {
    const decodedToken = await getAdminAuth().verifySessionCookie(sessionCookie);
    const { uid } = decodedToken;
    if (decodedToken) {
      // update cookie expiration date
      (await cookies()).set("__session", sessionCookie, {
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });
      // send custom token to the client
      console.log("clientauth: creating custom token with uid: ", uid);
      const customToken = await getAdminAuth().createCustomToken(uid);
      console.log("clientauth: sending custom token to client");
      return NextResponse.json({ token: customToken }, { status: 200 });
    }

    // if token is invalid, revoke active tokens & remove cookie
    console.log("clientauth: revoking tokens & removing cookie");
    if (uid) getAdminAuth().revokeRefreshTokens(uid);
    (await cookies()).delete("__session");

    return NextResponse.json(
      {
        message: "invalid session token",
        cookie: sessionCookie,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("clientauth: error: ", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
};

export { handler as GET };
