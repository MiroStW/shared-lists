import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// TODO instead of creating a custom token, just use the session token
// (which I'll replace with a fb-auth token)
// TODO: check if token expiration date gets extended on each request
// TODO: check if signout works across both client & server
// TODO: clean up code

const handler = async () => {
  // get next-auth token from cookies
  const cookie = cookies().get("__session")?.value;
  console.log("clientauth: called");
  if (!cookie) {
    return NextResponse.json({ message: "no token provided" }, { status: 200 });
  }

  // validate cookie
  try {
    const { sessionCookie } = JSON.parse(cookie);
    const decodedToken =
      await getAuth(firebaseAdmin).verifySessionCookie(sessionCookie);
    const { uid } = decodedToken;
    if (decodedToken) {
      // update cookie expiration date
      cookies().set("__session", cookie, {
        path: "/",
        maxAge: 60 * 60 * 24 * 5,
        httpOnly: true,
        secure: true,
      });
      // send custom token to the client
      console.log("clientauth: creating custom token with uid: ", uid);
      const customToken = await getAuth(firebaseAdmin).createCustomToken(uid);
      console.log("clientauth: sending custom token to client: ", customToken);
      return NextResponse.json({ token: customToken }, { status: 200 });
    }

    // if token is invalid, revoke active tokens & remove cookie
    console.log("clientauth: revoking tokens & removing cookie");
    if (uid) getAuth(firebaseAdmin).revokeRefreshTokens(uid);
    cookies().delete("__session");

    return NextResponse.json(
      {
        message: "invalid session token",
      },
      { status: 200 }
    );
  } catch (error) {
    NextResponse.json({ message: error }, { status: 500 });
  }

  return null;
};

export { handler as GET };
