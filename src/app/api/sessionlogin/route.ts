import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const POST = async (request: NextRequest) => {
  const { idToken } = await request.json();
  console.log("idToken: ", idToken);
  const csrfToken = cookies().get("csrfToken")?.value;
  console.log("csrfToken: ", csrfToken);

  // TODO: does this IF make sense?
  if (csrfToken !== request.cookies.get("csrfToken")) {
    return NextResponse.json("Invalid CSRF token", { status: 401 });
  }

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

const GET = async () => {
  console.log("GET /signin/sessionlogin called");

  return NextResponse.json("GET /signin/sessionlogin called");
};

export { POST, GET };
