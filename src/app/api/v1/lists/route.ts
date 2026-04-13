import { NextResponse } from "next/server";
import { checkApiAuth } from "../../../../server/apiAuth";
import { prisma } from "../../../../db/prisma";

export async function GET(request: Request) {
  const auth = checkApiAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const lists = await prisma.list.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({ lists });
  } catch (err) {
    console.error("Fetch lists error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
