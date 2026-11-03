import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";

// Agent access tokens (KTD5): `sl_<token id>_<secret>`. The token id is public
// and used for the lookup; the secret has 256 bits of entropy, so a plain
// SHA-256 of the whole token is a safe thing to store (no bcrypt needed).
const TOKEN_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_ID_LENGTH = 8;
const SECRET_BYTES = 32;
const TOKEN_PATTERN = /^sl_([a-z0-9]{8})_([A-Za-z0-9_-]{43})$/;

export const hashAgentToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const generateAgentToken = () => {
  const tokenId = Array.from(
    { length: TOKEN_ID_LENGTH },
    () => TOKEN_ID_ALPHABET[randomInt(TOKEN_ID_ALPHABET.length)],
  ).join("");
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const token = `sl_${tokenId}_${secret}`;
  return { token, tokenId, tokenHash: hashAgentToken(token) };
};

// The token id of a well-formed token, or null.
export const parseAgentToken = (token: string) => {
  const match = TOKEN_PATTERN.exec(token);
  return match ? { tokenId: match[1] } : null;
};

// Compares in constant time, so the response time does not leak how much of
// a guessed token was right.
export const agentTokenMatches = (token: string, storedHash: string) => {
  const actual = Buffer.from(hashAgentToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return (
    actual.length === expected.length && timingSafeEqual(actual, expected)
  );
};
