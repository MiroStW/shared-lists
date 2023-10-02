import { adminDb, firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const handler = async (request: Request) => {
  // get user id from request body
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ message: "no user id" }, { status: 401 });
  }

  // get next-auth token from cookies
  const httpToken = cookies().get("next-auth.session-token")?.value;

  if (!httpToken) {
    return NextResponse.json({ message: "no token provided" }, { status: 401 });
  }

  // compare token to the one stored in firestore
  try {
    const snapshot = await adminDb()
      .collection("sessions")
      .where("sessionToken", "==", httpToken)
      .where("expires", ">", new Date())
      .get();

    const match = snapshot.docs.some(
      (doc) =>
        doc.data().userId === userId && doc.data().sessionToken === httpToken
    );

    if (match) {
      // if they match, create custom token for client side auth
      const fbToken = await getAuth(firebaseAdmin).createCustomToken(userId);
      return NextResponse.json({ token: fbToken }, { status: 200 });
    }

    // if they don't match, return an error
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

export { handler as POST };
