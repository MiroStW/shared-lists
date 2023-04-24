import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const POST = async (request: NextRequest) => {
  const req = await request.json();
  const { idToken } = req;
  const csrfToken = cookies().get("csrfToken")?.value;

  if (csrfToken !== request.cookies.get("csrfToken")) {
    return new Response("Invalid CSRF token", { status: 401 });
  }

  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5;

  try {
    const sessionCookie = await getAuth().createSessionCookie(idToken, {
      expiresIn: expiresIn * 1000,
    });
    const options = { maxAge: expiresIn, httpOnly: true, secure: true };
    return new Response(undefined, {
      status: 200,
      headers: {
        "Set-Cookie": `__session=${sessionCookie}; Path=/; Max-Age=${expiresIn}; httpOnly; secure`,
      },
    });
  } catch (error) {
    return new Response("error", {
      status: 401,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

export { POST };
