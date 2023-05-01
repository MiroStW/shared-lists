/* eslint-disable no-underscore-dangle */
import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (request: NextApiRequest, response: NextApiResponse) => {
  const { sessionCookie } = request.cookies.__session
    ? JSON.parse(request.cookies.__session)
    : undefined;
  console.log("sessionCookie", sessionCookie);

  try {
    const decodedClaims = await getAuth(firebaseAdmin).verifySessionCookie(
      sessionCookie
    );

    getAuth().revokeRefreshTokens(decodedClaims.uid);

    response.setHeader(
      "Set-Cookie",
      `__session=; Path=/; Max-Age=0; httpOnly; secure`
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
