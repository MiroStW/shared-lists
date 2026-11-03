import { NextResponse } from "next/server";
import { ListServiceError } from "server/lists/access";

// Thrown by actorFromRequest when the request carries no valid credentials.
export class UnauthenticatedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthenticatedError";
  }
}

type ErrorResponseOptions = {
  // Log prefix for unexpected errors, e.g. "Error updating item:".
  context: string;
  // Status for a missing list, item or section. Most list routes have always
  // answered 403 there so they do not reveal which ids exist.
  notFoundStatus?: 403 | 404;
};

const forbidden = () =>
  NextResponse.json({ error: "Forbidden" }, { status: 403 });

// Maps a thrown error to the JSON error responses the web routes have always
// used. Unknown errors are logged and answered with 500.
export const errorResponse = (
  error: unknown,
  { context, notFoundStatus = 404 }: ErrorResponseOptions,
) => {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof ListServiceError) {
    switch (error.kind) {
      case "invalid":
        return NextResponse.json({ error: error.message }, { status: 400 });
      case "forbidden":
        return forbidden();
      case "not_found":
        return notFoundStatus === 403
          ? forbidden()
          : NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
  }
  console.error(context, error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
