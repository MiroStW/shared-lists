import { NextResponse } from "next/server";

export function checkMachineAuth(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const expectedToken = process.env.SHARED_LISTS_MACHINE_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return { error: "Forbidden: Invalid machine token", status: 403 };
  }

  return { error: null };
}
