export type ObjectStoreErrorCode =
  "closed" | "disabled" | "invalid-key" | "invalid-ttl" | "not-found" | "operation-failed";

export class ObjectStoreError extends Error {
  constructor(
    readonly code: ObjectStoreErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ObjectStoreError";
  }
}

export class ObjectStoreClosedError extends ObjectStoreError {
  constructor() {
    super("closed", "Object storage is closed");
    this.name = "ObjectStoreClosedError";
  }
}

export class ObjectStoreDisabledError extends ObjectStoreError {
  constructor() {
    super("disabled", "Object storage is disabled");
    this.name = "ObjectStoreDisabledError";
  }
}

export class InvalidObjectKeyError extends ObjectStoreError {
  constructor(readonly key: string) {
    super("invalid-key", "Object key must be a non-empty relative POSIX path without traversal");
    this.name = "InvalidObjectKeyError";
  }
}

export class InvalidSignedReadTtlError extends ObjectStoreError {
  constructor(readonly value: number) {
    super("invalid-ttl", "Signed read TTL must be an integer from 1 through 604800 seconds");
    this.name = "InvalidSignedReadTtlError";
  }
}

export class ObjectNotFoundError extends ObjectStoreError {
  constructor(
    readonly key: string,
    options?: ErrorOptions,
  ) {
    super("not-found", `Object not found: ${key}`, options);
    this.name = "ObjectNotFoundError";
  }
}

export class ObjectStoreOperationError extends ObjectStoreError {
  constructor(
    readonly operation: "put" | "get" | "delete" | "copy" | "signRead" | "health",
    message: string,
    options?: ErrorOptions,
  ) {
    super("operation-failed", message, options);
    this.name = "ObjectStoreOperationError";
  }
}

declare const objectRefBrand: unique symbol;
declare const signedReadTtlBrand: unique symbol;

export type ObjectRef = string & { readonly [objectRefBrand]: true };
export type SignedReadTtl = number & { readonly [signedReadTtlBrand]: true };

export type ObjectStorePut = Readonly<{
  ref: ObjectRef;
  content: ArrayBuffer;
  contentType: string;
}>;

export type ObjectStoreCopy = Readonly<{
  sourceRef: ObjectRef;
  destinationRef: ObjectRef;
}>;

export type ObjectStoreSignRead = Readonly<{
  ref: ObjectRef;
  ttl: SignedReadTtl;
  downloadFilename?: string;
  disposition?: "attachment" | "inline";
}>;

export type ObjectStoreHealth =
  | Readonly<{ kind: "healthy" }>
  | Readonly<{
      kind: "unhealthy";
      reason: "disabled" | "unavailable";
      error: ObjectStoreError;
    }>;

export interface ObjectStore {
  readonly requestTimeoutMs?: number;
  put(input: ObjectStorePut): Promise<void>;
  get(ref: ObjectRef): Promise<ArrayBuffer>;
  delete(ref: ObjectRef): Promise<void>;
  copy(input: ObjectStoreCopy): Promise<void>;
  signRead(input: ObjectStoreSignRead): Promise<string>;
  health(): Promise<ObjectStoreHealth>;
  close(): void;
}

export function parseObjectRef(value: string): ObjectRef {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    /^[A-Za-z]:\//.test(value) ||
    value.endsWith("/") ||
    value.includes("\\") ||
    value.includes("\0")
  ) {
    throw new InvalidObjectKeyError(value);
  }

  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new InvalidObjectKeyError(value);
  }
  return value as ObjectRef;
}

export function parseSignedReadTtl(value: number): SignedReadTtl {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 604_800) {
    throw new InvalidSignedReadTtlError(value);
  }
  return value as SignedReadTtl;
}
