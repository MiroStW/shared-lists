import { adminAuth } from "auth/getServerSession";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const GET = async (request: NextRequest) => {
  const url = new URL(request.url);

  const idToken = url.searchParams.get("idToken");
  console.log("idToken: ", idToken?.padStart(10, "*"));

  if (!idToken) return NextResponse.json("no token provided", { status: 200 });

  // Set session expiration to 14 days.
  const expiresIn = 60 * 60 * 24 * 14;

  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: expiresIn * 1000,
    });
    cookies().set("__session", sessionCookie, {
      path: "/",
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
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
