import { ToolInputError } from "server/tools/errors";

export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// The parsed JSON body. Throws ToolInputError for a body that is not JSON.
// With emptyAs, an empty or blank body stands for that value instead.
export const readJsonBody = async (
  request: Request,
  { emptyAs }: { emptyAs?: unknown } = {},
): Promise<unknown> => {
  try {
    const text = await request.text();
    if (emptyAs !== undefined && !text.trim()) return emptyAs;
    return JSON.parse(text) as unknown;
  } catch {
    throw new ToolInputError("Request body must be valid JSON");
  }
};
