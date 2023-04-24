import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

const GET = async (request: NextRequest) => {
  try {
    // const sessionCookie = "DOESTHISWORK?";
    const sessionCookie = cookies().get("__session");
    // const sessionCookie = request.cookies.get("__session") || "";
    // const { uid } = await getAuth(firebaseAdmin).verifySessionCookie(
    //   sessionCookie.toString(),
    //   true
    // );
    // const user = await getAuth().getUser(uid);
    // console.log("user in POST: ", user);
    return NextResponse.json({ sessionCookie });
  } catch (error: unknown) {
    return new NextResponse(JSON.stringify({ error }), { status: 401 });
  }
};

export { GET };
