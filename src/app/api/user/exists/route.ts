import { prisma } from "db/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error("Error checking user existence:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
