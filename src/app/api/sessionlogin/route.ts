import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const GET = async (request: NextRequest) => {
  const url = new URL(request.url);

  const idToken = url.searchParams.get("idToken");
  console.log("idToken: ", idToken);

  if (!idToken) return NextResponse.json("no token provided", { status: 200 });

  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5;

  try {
    const sessionCookie = await getAuth(firebaseAdmin).createSessionCookie(
      idToken,
      {
        expiresIn: expiresIn * 1000,
      }
    );
    cookies().set("__session", sessionCookie, {
      path: "/",
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
    });
    return NextResponse.json("session created", { status: 200 });
  } catch (error) {
    if (error instanceof Error)
      return NextResponse.json("error", {
        status: 401,
        statusText: error.message,
        headers: { "Content-Type": "text/plain" },
      });

    return NextResponse.json("error", {
      status: 401,
      statusText: `Unknown error: ${error}`,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

export { GET };
