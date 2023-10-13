import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// TODO: get csrfToken check to work
// TODO: clean up code
// TODO: add email and github login

const handler = async () => {
  const sessionCookie = cookies().get("__session")?.value;

  if (!sessionCookie) {
    return NextResponse.json({ message: "no token provided" }, { status: 200 });
  }

  // validate cookie
  try {
    const decodedToken =
      await getAuth(firebaseAdmin).verifySessionCookie(sessionCookie);
    const { uid } = decodedToken;
    if (decodedToken) {
      // update cookie expiration date
      cookies().set("__session", sessionCookie, {
        path: "/",
        maxAge: 60 * 60 * 24 * 5,
        httpOnly: true,
        secure: true,
      });
      // send custom token to the client
      console.log("clientauth: creating custom token with uid: ", uid);
      const customToken = await getAuth(firebaseAdmin).createCustomToken(uid);
      console.log("clientauth: sending custom token to client");
      return NextResponse.json({ token: customToken }, { status: 200 });
    }

    // if token is invalid, revoke active tokens & remove cookie
    console.log("clientauth: revoking tokens & removing cookie");
    if (uid) getAuth(firebaseAdmin).revokeRefreshTokens(uid);
    cookies().delete("__session");

    return NextResponse.json(
      {
        message: "invalid session token",
        cookie: sessionCookie,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
};

export { handler as GET };
