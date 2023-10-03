import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// TODO instead of creating a custom token, just use the session token
// (which I'll replace with a fb-auth token)

const handler = async () => {
  // get next-auth token from cookies
  const sessionCookie = cookies().get("__session")?.value;

  if (!sessionCookie) {
    return NextResponse.json({ message: "no token provided" }, { status: 401 });
  }

  // validate cookie
  try {
    const decodedToken = await getAuth(firebaseAdmin).verifySessionCookie(
      sessionCookie
    );

    if (decodedToken) {
      // if token is valid, send it to the client
      return NextResponse.json({ token: decodedToken }, { status: 200 });
    }

    // if token is invalid, return an error
    return NextResponse.json(
      {
        message: "invalid session token",
      },
      { status: 401 }
    );
  } catch (error) {
    NextResponse.json({ message: error }, { status: 500 });
  }

  return null;
};

export { handler as GET };
