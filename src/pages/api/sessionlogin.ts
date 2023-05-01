import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (request: NextApiRequest, response: NextApiResponse) => {
  const { idToken } = request.body;
  const { csrfToken } = request.cookies;

  console.log("csrfToken", csrfToken);

  // if (csrfToken !== request.cookies.get("csrfToken")) {
  //   return new Response("Invalid CSRF token", { status: 401 });
  // }

  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5;
  const date = new Date();
  const expirationDate = date.setDate(date.getDate() + 5);

  try {
    const sessionCookie = await getAuth(firebaseAdmin).createSessionCookie(
      idToken,
      {
        expiresIn: expiresIn * 1000,
      }
    );
    console.log("sessionCookie: ", sessionCookie);
    // TODO how to set cookies for various domains?
    response.setHeader(
      "Set-Cookie",
      `__session=${JSON.stringify({
        sessionCookie,
        expirationDate,
      })}; Path=/; Max-Age=${expiresIn}; httpOnly; secure`
    );
    response.end();
  } catch (error) {
    if (error instanceof Error) {
      console.log("error", error.message);
      response.status(401).send(error.message);
    } else {
      console.log("error", error);
      response.status(401).send(`Unknown error: ${error}`);
    }
  }
};

export default handler;
