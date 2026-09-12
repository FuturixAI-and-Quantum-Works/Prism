import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Provider } from "./types.js";

export const AI_CREDENTIAL_FORMAT_VERSION = 1;

export type EncryptedCredential = Readonly<{
  credentialVersion: number;
  credentialKeyId: string;
  encryptedCredential: string;
  iv: string;
  authTag: string;
}>;

type CredentialIdentity = Readonly<{
  userId: string;
  provider: Provider;
}>;

export type CredentialEncryptionConfig = Readonly<{
  activeKeyId: string;
  keys: Readonly<Record<string, string>>;
}>;

function keyFor(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

function aad(identity: CredentialIdentity, version: number): Buffer {
  return Buffer.from(
    JSON.stringify({
      version,
      userId: identity.userId,
      provider: identity.provider,
    }),
    "utf8",
  );
}

export function encryptCredential(
  plaintext: string,
  identity: CredentialIdentity,
  encryption: CredentialEncryptionConfig,
): EncryptedCredential {
  const keySecret = encryption.keys[encryption.activeKeyId];
  if (!keySecret) throw new Error("Active AI credential encryption key is unavailable");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(keySecret), iv);
  cipher.setAAD(aad(identity, AI_CREDENTIAL_FORMAT_VERSION));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    credentialVersion: AI_CREDENTIAL_FORMAT_VERSION,
    credentialKeyId: encryption.activeKeyId,
    encryptedCredential: encrypted.toString("base64url"),
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
  };
}

export function decryptCredential(
  encrypted: EncryptedCredential,
  identity: CredentialIdentity,
  encryption: CredentialEncryptionConfig,
): Readonly<{ plaintext: string; needsRotation: boolean }> {
  if (encrypted.credentialVersion !== AI_CREDENTIAL_FORMAT_VERSION) {
    throw new Error(`Unsupported AI credential format version ${encrypted.credentialVersion}`);
  }
  const keySecret = encryption.keys[encrypted.credentialKeyId];
  if (!keySecret) throw new Error("AI credential encryption key is unavailable");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFor(keySecret),
    Buffer.from(encrypted.iv, "base64url"),
  );
  decipher.setAAD(aad(identity, encrypted.credentialVersion));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.encryptedCredential, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return {
    plaintext,
    needsRotation: encrypted.credentialKeyId !== encryption.activeKeyId,
  };
}
