import crypto from "crypto";
import { getAppConfig } from "../config.js";

function getSecret(): string {
  return getAppConfig().secrets.downloadSigning;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): Buffer {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return Buffer.from(t, "base64");
}

function timingSafeEqStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function signDownload(path: string, filename: string): string {
  const payload = JSON.stringify({ p: path, f: filename });
  const enc = b64urlEncode(Buffer.from(payload, "utf8"));
  const sig = crypto.createHmac("sha256", getSecret()).update(enc).digest();
  return `${enc}.${b64urlEncode(sig)}`;
}

export function verifyDownload(token: string): { path: string; filename: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [enc, sigEnc] = parts;
  const expected = crypto.createHmac("sha256", getSecret()).update(enc).digest();
  if (!timingSafeEqStr(sigEnc, b64urlEncode(expected))) return null;
  try {
    const parsed: unknown = JSON.parse(b64urlDecode(enc).toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const path = Reflect.get(parsed, "p");
    const filename = Reflect.get(parsed, "f");
    if (typeof path !== "string" || !path || typeof filename !== "string" || !filename) return null;
    return { path, filename };
  } catch {
    return null;
  }
}

export function buildDownloadUrl(path: string, filename: string): string {
  return `/download/${signDownload(path, filename)}`;
}
