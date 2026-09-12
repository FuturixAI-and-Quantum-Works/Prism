import type { S3ObjectStoreOptions } from "./s3ObjectStore.js";

type Environment = Readonly<Record<string, string | undefined>>;
type RuntimeKind = "development" | "test" | "production";

function value(environment: Environment, primary: string, alias?: string): string | undefined {
  return environment[primary]?.trim() || (alias ? environment[alias]?.trim() : undefined);
}

function parseBoolean(raw: string | undefined): boolean {
  if (!raw) return false;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function parseRequestTimeout(raw: string | undefined): number {
  if (!raw) return 60_000;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error("OBJECT_STORE_REQUEST_TIMEOUT_MS must be a positive integer");
  }
  return parsed;
}

function parseEndpoint(raw: string, kind: RuntimeKind): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("OBJECT_STORE_ENDPOINT must be a valid URL");
  }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    url.protocol !== "https:" &&
    !(kind === "development" && url.protocol === "http:" && loopback)
  ) {
    throw new Error("OBJECT_STORE_ENDPOINT must use HTTPS except for loopback HTTP in development");
  }
  if (url.username || url.password) {
    throw new Error("OBJECT_STORE_ENDPOINT must not include credentials");
  }
  if (url.search || url.hash) {
    throw new Error("OBJECT_STORE_ENDPOINT must not include a query or fragment");
  }
  return url.toString().replace(/\/$/, "");
}

export function hasS3ObjectStoreEnvironment(environment: Environment): boolean {
  return Boolean(
    value(environment, "OBJECT_STORE_ENDPOINT", "R2_ENDPOINT_URL") ||
    value(environment, "OBJECT_STORE_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID") ||
    value(environment, "OBJECT_STORE_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY") ||
    value(environment, "OBJECT_STORE_BUCKET", "R2_BUCKET_NAME"),
  );
}

export function parseS3ObjectStoreConfig(
  environment: Environment,
  kind: RuntimeKind,
): S3ObjectStoreOptions {
  const usesGeneric = Boolean(
    environment.OBJECT_STORE_ENDPOINT?.trim() ||
    environment.OBJECT_STORE_ACCESS_KEY_ID?.trim() ||
    environment.OBJECT_STORE_SECRET_ACCESS_KEY?.trim() ||
    environment.OBJECT_STORE_BUCKET?.trim() ||
    environment.OBJECT_STORE_REGION?.trim(),
  );
  const usesR2 = Boolean(
    environment.R2_ENDPOINT_URL?.trim() ||
    environment.R2_ACCESS_KEY_ID?.trim() ||
    environment.R2_SECRET_ACCESS_KEY?.trim() ||
    environment.R2_BUCKET_NAME?.trim(),
  );
  if (usesGeneric && usesR2) {
    throw new Error("Configure either OBJECT_STORE_* settings or R2 aliases, not both");
  }
  const endpoint = usesGeneric
    ? environment.OBJECT_STORE_ENDPOINT?.trim()
    : environment.R2_ENDPOINT_URL?.trim();
  const accessKeyId = usesGeneric
    ? environment.OBJECT_STORE_ACCESS_KEY_ID?.trim()
    : environment.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = usesGeneric
    ? environment.OBJECT_STORE_SECRET_ACCESS_KEY?.trim()
    : environment.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = usesGeneric
    ? environment.OBJECT_STORE_BUCKET?.trim()
    : environment.R2_BUCKET_NAME?.trim() || "prism";
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    if (usesR2) {
      throw new Error(
        "R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must be configured together",
      );
    }
    throw new Error(
      "OBJECT_STORE_ENDPOINT, OBJECT_STORE_ACCESS_KEY_ID, OBJECT_STORE_SECRET_ACCESS_KEY, and OBJECT_STORE_BUCKET must be configured together",
    );
  }

  return {
    endpoint: parseEndpoint(endpoint, kind),
    region: usesGeneric
      ? environment.OBJECT_STORE_REGION?.trim() || "us-east-1"
      : environment.R2_REGION?.trim() || "auto",
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: usesGeneric ? parseBoolean(environment.OBJECT_STORE_FORCE_PATH_STYLE) : true,
    requestTimeoutMs: parseRequestTimeout(environment.OBJECT_STORE_REQUEST_TIMEOUT_MS),
  };
}
