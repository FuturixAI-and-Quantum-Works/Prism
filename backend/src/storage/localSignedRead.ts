import { createHmac, timingSafeEqual } from "node:crypto";
import { parseObjectRef, type ObjectRef, type SignedReadTtl } from "./types.js";

export type LocalSignedRead = Readonly<{
  ref: ObjectRef;
  expiresAt: number;
  filename: string;
  disposition: "attachment" | "inline";
}>;

type SignLocalReadInput = Readonly<{
  ref: ObjectRef;
  ttl: SignedReadTtl;
  filename: string;
  disposition: "attachment" | "inline";
  secret: string;
  now?: number;
}>;

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function signLocalRead(input: SignLocalReadInput): string {
  const expiresAt = Math.floor(input.now ?? Date.now() / 1000) + input.ttl;
  const payload = Buffer.from(
    JSON.stringify({
      ref: input.ref,
      exp: expiresAt,
      filename: input.filename,
      disposition: input.disposition,
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload, input.secret)}`;
}

export function verifyLocalRead(
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): LocalSignedRead | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, suppliedSignature] = parts;
  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      !isRecord(decoded) ||
      typeof decoded.ref !== "string" ||
      typeof decoded.exp !== "number" ||
      !Number.isSafeInteger(decoded.exp) ||
      decoded.exp <= now ||
      typeof decoded.filename !== "string" ||
      decoded.filename.length === 0 ||
      (decoded.disposition !== "attachment" && decoded.disposition !== "inline")
    ) {
      return null;
    }
    return {
      ref: parseObjectRef(decoded.ref),
      expiresAt: decoded.exp,
      filename: decoded.filename,
      disposition: decoded.disposition,
    };
  } catch {
    return null;
  }
}
