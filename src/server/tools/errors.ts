import { NextResponse } from "next/server";
import type { z } from "zod";
import { UnauthenticatedError } from "server/http/errors";
import { ListServiceError } from "server/lists/access";

export type FieldErrors = Record<string, string[]>;

// Input that does not match a tool's schema. fields maps a dotted path
// ("items.0.name", or "input" for the whole input) to its messages.
export class ToolInputError extends Error {
  readonly fields: FieldErrors;

  constructor(message: string, fields: FieldErrors = {}) {
    super(message);
    this.name = "ToolInputError";
    this.fields = fields;
  }

  static fromZod(toolName: string, error: z.ZodError) {
    const fields: FieldErrors = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "input";
      (fields[key] ??= []).push(issue.message);
    }
    return new ToolInputError(`Invalid input for ${toolName}`, fields);
  }
}

export class UnknownToolError extends Error {
  constructor(name: string) {
    super(`Unknown tool "${name}"`);
    this.name = "UnknownToolError";
  }
}

export type ToolErrorBody = { error: string; fields?: FieldErrors };

const SERVICE_STATUS = {
  invalid: 400,
  forbidden: 403,
  not_found: 404,
} as const;

// Status and JSON body for an expected error, or null for anything else.
// Tool errors keep their message: it tells an agent what to fix, e.g. which
// list names exist.
export const describeToolError = (
  error: unknown,
): { status: number; body: ToolErrorBody } | null => {
  if (error instanceof ToolInputError) {
    return {
      status: 400,
      body: { error: error.message, fields: error.fields },
    };
  }
  if (error instanceof UnknownToolError) {
    return { status: 404, body: { error: error.message } };
  }
  if (error instanceof UnauthenticatedError) {
    return { status: 401, body: { error: "Unauthorized" } };
  }
  if (error instanceof ListServiceError) {
    return {
      status: SERVICE_STATUS[error.kind],
      body: { error: error.message },
    };
  }
  return null;
};

export const toolErrorResponse = (error: unknown, context: string) => {
  const described = describeToolError(error);
  if (described) {
    return NextResponse.json(described.body, { status: described.status });
  }
  console.error(context, error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
