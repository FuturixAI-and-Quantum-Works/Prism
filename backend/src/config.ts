import { z } from "zod";
import { requireStrongSecret } from "./lib/security.js";
import {
  hasS3ObjectStoreEnvironment,
  parseS3ObjectStoreConfig,
} from "./storage/s3ObjectStoreConfig.js";

type Environment = Readonly<Record<string, string | undefined>>;

const positiveInteger = z.coerce.number().int().positive();
const nonnegativeInteger = z.coerce.number().int().nonnegative();
const optionalString = z.string().trim().min(1).optional();

const rateLimitDefaults = {
  general: { windowMs: 15 * 60_000, max: 300 },
  chat: { windowMs: 15 * 60_000, max: 30 },
  chatCreate: { windowMs: 15 * 60_000, max: 60 },
  upload: { windowMs: 60 * 60_000, max: 50 },
  compliance: { windowMs: 15 * 60_000, max: 100 },
  invitationLookup: { windowMs: 15 * 60_000, max: 60 },
  invitationDecision: { windowMs: 15 * 60_000, max: 20 },
  invitationSend: { windowMs: 60 * 60_000, max: 30 },
  publicApprovalRead: { windowMs: 15 * 60_000, max: 60 },
  publicApprovalDecision: { windowMs: 15 * 60_000, max: 10 },
  tabularPrompt: { windowMs: 15 * 60_000, max: 30 },
  tabularRegenerate: { windowMs: 15 * 60_000, max: 20 },
  fileVersionRead: { windowMs: 15 * 60_000, max: 120 },
  providerCheck: { windowMs: 15 * 60_000, max: 10 },
} as const;

type RateLimitName = keyof typeof rateLimitDefaults;

const rateLimitEnvironmentNames = {
  general: ["RATE_LIMIT_GENERAL_WINDOW_MINUTES", "RATE_LIMIT_GENERAL_MAX", 60_000],
  chat: ["RATE_LIMIT_CHAT_WINDOW_MINUTES", "RATE_LIMIT_CHAT_MAX", 60_000],
  chatCreate: ["RATE_LIMIT_CHAT_CREATE_WINDOW_MINUTES", "RATE_LIMIT_CHAT_CREATE_MAX", 60_000],
  upload: ["RATE_LIMIT_UPLOAD_WINDOW_HOURS", "RATE_LIMIT_UPLOAD_MAX", 3_600_000],
  compliance: ["RATE_LIMIT_COMPLIANCE_WINDOW_MINUTES", "RATE_LIMIT_COMPLIANCE_MAX", 60_000],
  invitationLookup: [
    "RATE_LIMIT_INVITATION_LOOKUP_WINDOW_MINUTES",
    "RATE_LIMIT_INVITATION_LOOKUP_MAX",
    60_000,
  ],
  invitationDecision: [
    "RATE_LIMIT_INVITATION_DECISION_WINDOW_MINUTES",
    "RATE_LIMIT_INVITATION_DECISION_MAX",
    60_000,
  ],
  invitationSend: [
    "RATE_LIMIT_INVITATION_SEND_WINDOW_HOURS",
    "RATE_LIMIT_INVITATION_SEND_MAX",
    3_600_000,
  ],
  publicApprovalRead: [
    "RATE_LIMIT_PUBLIC_APPROVAL_READ_WINDOW_MINUTES",
    "RATE_LIMIT_PUBLIC_APPROVAL_READ_MAX",
    60_000,
  ],
  publicApprovalDecision: [
    "RATE_LIMIT_PUBLIC_APPROVAL_DECISION_WINDOW_MINUTES",
    "RATE_LIMIT_PUBLIC_APPROVAL_DECISION_MAX",
    60_000,
  ],
  tabularPrompt: [
    "RATE_LIMIT_TABULAR_PROMPT_WINDOW_MINUTES",
    "RATE_LIMIT_TABULAR_PROMPT_MAX",
    60_000,
  ],
  tabularRegenerate: [
    "RATE_LIMIT_TABULAR_REGENERATE_WINDOW_MINUTES",
    "RATE_LIMIT_TABULAR_REGENERATE_MAX",
    60_000,
  ],
  fileVersionRead: [
    "RATE_LIMIT_FILE_VERSION_READ_WINDOW_MINUTES",
    "RATE_LIMIT_FILE_VERSION_READ_MAX",
    60_000,
  ],
  providerCheck: [
    "RATE_LIMIT_PROVIDER_CHECK_WINDOW_MINUTES",
    "RATE_LIMIT_PROVIDER_CHECK_MAX",
    60_000,
  ],
} as const;

const rateLimitSchema = z.object({
  windowMs: positiveInteger,
  max: positiveInteger,
});

const runtimeBaseSchema = z.object({
  port: positiveInteger.max(65_535),
  trustProxy: z.union([z.literal(false), positiveInteger]),
  shutdownTimeoutMs: positiveInteger,
  rateLimits: z.object({
    general: rateLimitSchema,
    chat: rateLimitSchema,
    chatCreate: rateLimitSchema,
    upload: rateLimitSchema,
    compliance: rateLimitSchema,
    invitationLookup: rateLimitSchema,
    invitationDecision: rateLimitSchema,
    invitationSend: rateLimitSchema,
    publicApprovalRead: rateLimitSchema,
    publicApprovalDecision: rateLimitSchema,
    tabularPrompt: rateLimitSchema,
    tabularRegenerate: rateLimitSchema,
    fileVersionRead: rateLimitSchema,
    providerCheck: rateLimitSchema,
  }),
});

const runtimeSchema = z.discriminatedUnion("kind", [
  runtimeBaseSchema.extend({ kind: z.literal("development") }),
  runtimeBaseSchema.extend({ kind: z.literal("test") }),
  runtimeBaseSchema.extend({
    kind: z.literal("production"),
    trustProxy: z.union([z.literal(false), z.literal(1)]),
  }),
]);

const databaseSchema = z.object({
  url: z.string().trim().min(1),
  connectionTimeoutMs: positiveInteger,
  idleTimeoutMs: positiveInteger,
  queryTimeoutMs: positiveInteger,
  statementTimeoutMs: positiveInteger,
});

const googleAuthSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("disabled") }),
  z.object({
    kind: z.literal("google"),
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
  }),
]);

const authSchema = z.object({
  baseUrl: z.string().url(),
  frontendUrl: z.string().url(),
  trustedOrigins: z.array(z.string().url()).min(1),
  shareInviteExpiryDays: positiveInteger,
  google: googleAuthSchema,
});

const secretsSchema = z.object({
  betterAuth: z.string().min(1),
  authOtp: z.string().min(1),
  downloadSigning: z.string().min(1),
});

const storageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("disabled") }),
  z.object({
    kind: z.literal("local"),
    directory: z.string().min(1),
    publicApiUrl: z.string().url(),
  }),
  z.object({
    kind: z.literal("s3"),
    endpoint: z.string().url().optional(),
    region: z.string().min(1),
    forcePathStyle: z.boolean(),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1),
    bucket: z.string().min(1),
    requestTimeoutMs: positiveInteger,
  }),
]);

const mailSenderSchema = z.object({
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional(),
  displayName: z.string().min(1),
});

const mailSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("console"),
    sendTimeoutMs: positiveInteger,
  }),
  mailSenderSchema.extend({
    kind: z.literal("resend"),
    apiKey: z.string().min(1),
    sendTimeoutMs: positiveInteger,
  }),
  mailSenderSchema.extend({
    kind: z.literal("smtp"),
    host: z.string().min(1),
    port: positiveInteger.max(65_535),
    secure: z.boolean(),
    auth: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("none") }),
      z.object({
        kind: z.literal("credentials"),
        username: z.string().min(1),
        password: z.string().min(1),
      }),
    ]),
    sendTimeoutMs: positiveInteger,
  }),
]);

const serviceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("disabled") }),
  z.object({
    kind: z.literal("http"),
    baseUrl: z.string().url(),
    requestTimeoutMs: positiveInteger,
  }),
]);

const ragSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("disabled") }),
  z.object({
    kind: z.literal("qdrant"),
    url: z.string().url(),
    apiKey: z.string().min(1),
    requestTimeoutMs: positiveInteger,
  }),
]);

const workerSchema = z.object({
  concurrency: positiveInteger.max(32),
  pollIntervalMs: positiveInteger,
  leaseDurationMs: positiveInteger,
  shutdownTimeoutMs: positiveInteger,
  healthCheckUrl: z.string().url(),
  healthCheckIntervalMs: positiveInteger,
  healthCleanupIntervalMs: positiveInteger,
  healthRetentionDays: positiveInteger,
});

const providerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("disabled") }),
  z.object({ kind: z.literal("configured"), apiKey: z.string().min(1) }),
]);

const appConfigSchema = z.object({
  runtime: runtimeSchema,
  database: databaseSchema,
  auth: authSchema,
  secrets: secretsSchema,
  storage: storageSchema,
  mail: mailSchema,
  rag: ragSchema,
  worker: workerSchema,
  conversion: z.object({
    service: serviceSchema,
    libreOfficePath: z.string().trim().min(1),
    maxInputBytes: positiveInteger.max(1024 * 1024 * 1024),
    maxOutputBytes: positiveInteger.max(2 * 1024 * 1024 * 1024),
    timeoutMs: positiveInteger.max(10 * 60_000),
    concurrency: positiveInteger.max(16),
    maxQueuedPerAdapter: positiveInteger.max(256),
    allowChromiumNoSandbox: z.boolean(),
  }),
  ai: z.object({
    defaultModel: optionalString,
    requestTimeoutMs: positiveInteger,
    allowLocalHttpCustomEndpoints: z.boolean(),
    credentialEncryption: z.object({
      activeKeyId: z.string().min(1),
      keys: z.record(z.string().min(1), z.string().min(32)),
    }),
    anthropic: providerSchema,
    openai: providerSchema,
    google: providerSchema,
  }),
});

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

export type AppConfig = DeepReadonly<z.infer<typeof appConfigSchema>>;
export type DatabaseConfig = AppConfig["database"];
let installedConfig: AppConfig | undefined;

export function installAppConfig(config: AppConfig): void {
  if (installedConfig && installedConfig !== config)
    throw new Error("AppConfig is already installed");
  installedConfig = config;
}

export function getAppConfig(): AppConfig {
  if (!installedConfig) throw new Error("AppConfig has not been installed");
  return installedConfig;
}

function parseInteger(
  environment: Environment,
  name: string,
  fallback: number,
  schema = positiveInteger,
): number {
  return schema.parse(environment[name] ?? fallback);
}

function parseBoolean(raw: string | undefined): boolean {
  if (!raw) return false;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function parseOrigin(name: string, raw: string, kind: AppConfig["runtime"]["kind"]): string {
  if (raw === "*") throw new Error(`${name} must not contain a wildcard origin`);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} contains an invalid origin: ${raw}`);
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} contains an invalid origin: ${raw}`);
  }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(kind === "development" && loopback)) {
    throw new Error(`${name} must use HTTPS except for loopback HTTP in development`);
  }
  return url.origin;
}

function parseTrustedOrigins(
  environment: Environment,
  kind: AppConfig["runtime"]["kind"],
): string[] {
  const values = [environment.FRONTEND_URL, ...(environment.CORS_ALLOWED_ORIGINS ?? "").split(",")]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (values.length === 0 && kind !== "production") values.push("http://localhost:5173");
  if (values.length === 0) {
    throw new Error("FRONTEND_URL or CORS_ALLOWED_ORIGINS is required in production");
  }
  return [...new Set(values.map((value) => parseOrigin("trusted origin", value, kind)))];
}

function parseOptionalPair(
  environment: Environment,
  firstName: string,
  secondName: string,
): { first: string; second: string } | null {
  const first = environment[firstName]?.trim();
  const second = environment[secondName]?.trim();
  if (!first && !second) return null;
  if (!first || !second)
    throw new Error(`${firstName} and ${secondName} must be configured together`);
  return { first, second };
}

function assertSafeServiceUrl(
  raw: string,
  kind: AppConfig["runtime"]["kind"],
  name: string,
  options: Readonly<{ allowDevelopmentHttp?: boolean }> = {},
): string {
  const url = new URL(raw);
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const allowedDevelopmentHttp =
    kind === "development" &&
    url.protocol === "http:" &&
    (loopback || options.allowDevelopmentHttp);
  if (url.protocol !== "https:" && !allowedDevelopmentHttp) {
    throw new Error(`${name} must use HTTPS except for allowed HTTP endpoints in development`);
  }
  if (url.username || url.password) throw new Error(`${name} must not include credentials`);
  if (url.search || url.hash) throw new Error(`${name} must not include a query or fragment`);
  return url.toString().replace(/\/$/, "");
}

function provider(apiKey: string | undefined) {
  const value = apiKey?.trim();
  return value ? { kind: "configured" as const, apiKey: value } : { kind: "disabled" as const };
}

function parseCredentialKeys(environment: Environment): {
  activeKeyId: string;
  keys: Record<string, string>;
} {
  const activeKeyId = environment.AI_CREDENTIAL_ACTIVE_KEY_ID?.trim() || "v1";
  const raw = environment.AI_CREDENTIAL_ENCRYPTION_KEYS?.trim();
  if (!raw) {
    throw new Error("AI_CREDENTIAL_ENCRYPTION_KEYS is required");
  }
  const parsed: unknown = JSON.parse(raw);
  const entries = Object.entries(z.record(z.string().trim().min(1), z.string()).parse(parsed));
  const keys = Object.fromEntries(
    entries.map(([keyId, secret]) => [
      keyId,
      requireStrongSecret(`AI_CREDENTIAL_ENCRYPTION_KEYS.${keyId}`, secret),
    ]),
  );
  if (!keys[activeKeyId]) {
    throw new Error("AI_CREDENTIAL_ACTIVE_KEY_ID must identify a configured encryption key");
  }
  return { activeKeyId, keys };
}

function service(
  environment: Environment,
  kind: AppConfig["runtime"]["kind"],
  name: string,
  timeoutName: string,
) {
  const value = environment[name]?.trim();
  return value
    ? {
        kind: "http" as const,
        baseUrl: assertSafeServiceUrl(value, kind, name),
        requestTimeoutMs: parseInteger(environment, timeoutName, 15_000),
      }
    : { kind: "disabled" as const };
}

function parseRag(environment: Environment, kind: AppConfig["runtime"]["kind"]) {
  const url = environment.QDRANT_URL?.trim();
  const apiKey = environment.QDRANT_API_KEY?.trim();
  if (!url && !apiKey) return { kind: "disabled" as const };
  if (!url || !apiKey) {
    throw new Error("QDRANT_URL and QDRANT_API_KEY must be configured together");
  }
  return {
    kind: "qdrant" as const,
    url: assertSafeServiceUrl(url, kind, "QDRANT_URL"),
    apiKey,
    requestTimeoutMs: parseInteger(environment, "RAG_REQUEST_TIMEOUT_MS", 15_000),
  };
}

function rateLimits(environment: Environment): AppConfig["runtime"]["rateLimits"] {
  const policy = (name: RateLimitName) => {
    const [windowName, maxName, multiplier] = rateLimitEnvironmentNames[name];
    const fallback = rateLimitDefaults[name];
    return {
      windowMs: parseInteger(environment, windowName, fallback.windowMs / multiplier) * multiplier,
      max: parseInteger(environment, maxName, fallback.max),
    };
  };
  return {
    general: policy("general"),
    chat: policy("chat"),
    chatCreate: policy("chatCreate"),
    upload: policy("upload"),
    compliance: policy("compliance"),
    invitationLookup: policy("invitationLookup"),
    invitationDecision: policy("invitationDecision"),
    invitationSend: policy("invitationSend"),
    publicApprovalRead: policy("publicApprovalRead"),
    publicApprovalDecision: policy("publicApprovalDecision"),
    tabularPrompt: policy("tabularPrompt"),
    tabularRegenerate: policy("tabularRegenerate"),
    fileVersionRead: policy("fileVersionRead"),
    providerCheck: policy("providerCheck"),
  };
}

export function parseDatabaseConfig(environment: Environment): DatabaseConfig {
  return databaseSchema.parse({
    url: environment.DATABASE_URL,
    connectionTimeoutMs: environment.PG_CONNECTION_TIMEOUT_MS ?? 5_000,
    idleTimeoutMs: environment.PG_IDLE_TIMEOUT_MS ?? 30_000,
    queryTimeoutMs: environment.PG_QUERY_TIMEOUT_MS ?? 10_000,
    statementTimeoutMs: environment.PG_STATEMENT_TIMEOUT_MS ?? 10_000,
  });
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value as DeepReadonly<T>;
}

export function parseAppConfig(environment: Environment): AppConfig {
  const environmentName = environment.NODE_ENV?.trim();
  if (
    environmentName &&
    environmentName !== "development" &&
    environmentName !== "test" &&
    environmentName !== "production"
  ) {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  const kind =
    environmentName === "production"
      ? "production"
      : environmentName === "test"
        ? "test"
        : "development";
  const trustProxyRaw = environment.TRUST_PROXY_HOPS?.trim();
  const trustProxy =
    !trustProxyRaw || trustProxyRaw === "0"
      ? false
      : parseInteger(environment, "TRUST_PROXY_HOPS", 0, nonnegativeInteger);
  if (kind === "production" && trustProxy !== false && trustProxy !== 1) {
    throw new Error("TRUST_PROXY_HOPS must be 0 or 1 in production");
  }

  const google = parseOptionalPair(environment, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
  const hasS3Config = hasS3ObjectStoreEnvironment(environment);
  const s3 = hasS3Config ? parseS3ObjectStoreConfig(environment, kind) : undefined;
  const storageKind =
    environment.STORAGE_PROVIDER?.trim() ||
    (hasS3Config ? "s3" : kind === "development" ? "local" : "disabled");
  const renderDetected =
    parseBoolean(environment.RENDER) ||
    Boolean(environment.RENDER_SERVICE_ID?.trim() || environment.RENDER_EXTERNAL_URL?.trim());
  if ((kind === "production" || renderDetected) && storageKind === "local") {
    throw new Error("Local filesystem storage is not allowed in production or on Render");
  }
  if (storageKind === "s3" && !s3) {
    throw new Error(
      "OBJECT_STORE_ENDPOINT, OBJECT_STORE_ACCESS_KEY_ID, OBJECT_STORE_SECRET_ACCESS_KEY, and OBJECT_STORE_BUCKET must be configured together",
    );
  }
  if (!["disabled", "local", "s3"].includes(storageKind)) {
    throw new Error("STORAGE_PROVIDER must be disabled, local, or s3");
  }

  const chromiumSandboxMode =
    environment.CONVERSION_CHROMIUM_SANDBOX_MODE?.trim().toLowerCase() || "enabled";
  if (chromiumSandboxMode !== "enabled" && chromiumSandboxMode !== "disabled") {
    throw new Error("CONVERSION_CHROMIUM_SANDBOX_MODE must be enabled or disabled");
  }
  const noSandboxAcknowledged = parseBoolean(
    environment.CONVERSION_CHROMIUM_NO_SANDBOX_ACKNOWLEDGED,
  );
  if (chromiumSandboxMode === "disabled" && !noSandboxAcknowledged) {
    throw new Error(
      "Disabling the Chromium sandbox requires CONVERSION_CHROMIUM_NO_SANDBOX_ACKNOWLEDGED=true",
    );
  }
  if (chromiumSandboxMode === "enabled" && noSandboxAcknowledged) {
    throw new Error(
      "CONVERSION_CHROMIUM_NO_SANDBOX_ACKNOWLEDGED requires CONVERSION_CHROMIUM_SANDBOX_MODE=disabled",
    );
  }
  const allowChromiumNoSandbox = chromiumSandboxMode === "disabled";
  const resendApiKey = environment.RESEND_API_KEY?.trim();
  const smtpHost = environment.SMTP_HOST?.trim();
  const configuredMailProvider = environment.MAIL_PROVIDER?.trim().toLowerCase();
  const inferredMailProvider = resendApiKey ? "resend" : smtpHost ? "smtp" : "console";
  const mailProvider = configuredMailProvider || inferredMailProvider;
  if (!["console", "resend", "smtp"].includes(mailProvider)) {
    throw new Error("MAIL_PROVIDER must be console, resend, or smtp");
  }
  if (resendApiKey && smtpHost && !configuredMailProvider) {
    throw new Error("MAIL_PROVIDER is required when multiple mail providers are configured");
  }
  const fromEmail = environment.MAIL_FROM?.trim();
  const smtpCredentials = parseOptionalPair(environment, "SMTP_USERNAME", "SMTP_PASSWORD");
  const sendTimeoutMs = environment.EMAIL_SEND_TIMEOUT_MS ?? 10_000;
  const sender = {
    fromEmail,
    replyTo: environment.EMAIL_REPLY_TO?.trim() || undefined,
    displayName: environment.EMAIL_DISPLAY_NAME?.trim() || "Prism Legal",
  };
  let mail: z.input<typeof mailSchema>;
  if (mailProvider === "resend") {
    if (!resendApiKey || !fromEmail) {
      throw new Error("RESEND_API_KEY and MAIL_FROM are required for the Resend mail provider");
    }
    mail = { kind: "resend", apiKey: resendApiKey, ...sender, fromEmail, sendTimeoutMs };
  } else if (mailProvider === "smtp") {
    if (!smtpHost || !fromEmail) {
      throw new Error("SMTP_HOST and MAIL_FROM are required for the SMTP mail provider");
    }
    mail = {
      kind: "smtp",
      host: smtpHost,
      port: environment.SMTP_PORT ?? 587,
      secure: parseBoolean(environment.SMTP_SECURE),
      auth: smtpCredentials
        ? {
            kind: "credentials",
            username: smtpCredentials.first,
            password: smtpCredentials.second,
          }
        : { kind: "none" },
      ...sender,
      fromEmail,
      sendTimeoutMs,
    };
  } else {
    mail = { kind: "console", sendTimeoutMs };
  }

  const secrets = {
    betterAuth: requireStrongSecret("BETTER_AUTH_SECRET", environment.BETTER_AUTH_SECRET),
    authOtp: requireStrongSecret("AUTH_OTP_SECRET", environment.AUTH_OTP_SECRET),
    downloadSigning: requireStrongSecret(
      "DOWNLOAD_SIGNING_SECRET",
      environment.DOWNLOAD_SIGNING_SECRET,
    ),
  };
  const credentialEncryption = parseCredentialKeys(environment);
  const secretValues = [...Object.values(secrets), ...Object.values(credentialEncryption.keys)];
  if (new Set(secretValues).size !== secretValues.length) {
    throw new Error("Authentication and encryption secrets must be pairwise distinct");
  }

  const port = parseInteger(environment, "PORT", 3001);
  const trustedOrigins = parseTrustedOrigins(environment, kind);
  const baseUrl = parseOrigin(
    "BETTER_AUTH_URL",
    environment.BETTER_AUTH_URL?.trim() ?? `http://localhost:${port}`,
    kind,
  );
  const storage =
    storageKind === "s3" && s3
      ? {
          kind: "s3" as const,
          ...s3,
        }
      : storageKind === "local"
        ? {
            kind: "local" as const,
            directory: environment.LOCAL_STORAGE_PATH?.trim() || "./data",
            publicApiUrl: environment.PUBLIC_API_URL?.trim()
              ? assertSafeServiceUrl(environment.PUBLIC_API_URL.trim(), kind, "PUBLIC_API_URL")
              : baseUrl,
          }
        : { kind: "disabled" as const };

  const parsed = appConfigSchema.parse({
    runtime: {
      kind,
      port,
      trustProxy,
      shutdownTimeoutMs: environment.SHUTDOWN_TIMEOUT_MS ?? 10_000,
      rateLimits: rateLimits(environment),
    },
    database: parseDatabaseConfig(environment),
    auth: {
      baseUrl,
      frontendUrl: environment.FRONTEND_URL?.trim()
        ? parseOrigin("FRONTEND_URL", environment.FRONTEND_URL.trim(), kind)
        : trustedOrigins[0],
      trustedOrigins,
      shareInviteExpiryDays: environment.SHARE_INVITE_EXPIRY_DAYS ?? 7,
      google: google
        ? { kind: "google", clientId: google.first, clientSecret: google.second }
        : { kind: "disabled" },
    },
    secrets,
    storage,
    mail,
    rag: parseRag(environment, kind),
    worker: {
      concurrency: environment.WORKER_CONCURRENCY ?? 4,
      pollIntervalMs: environment.WORKER_POLL_INTERVAL_MS ?? 1_000,
      leaseDurationMs: environment.WORKER_LEASE_DURATION_MS ?? 60_000,
      shutdownTimeoutMs:
        environment.WORKER_SHUTDOWN_TIMEOUT_MS ?? environment.SHUTDOWN_TIMEOUT_MS ?? 10_000,
      healthCheckUrl: environment.HEALTHCHECK_API_URL?.trim()
        ? assertSafeServiceUrl(
            environment.HEALTHCHECK_API_URL.trim(),
            kind,
            "HEALTHCHECK_API_URL",
            {
              allowDevelopmentHttp: true,
            },
          )
        : `${baseUrl.replace(/\/$/, "")}/health`,
      healthCheckIntervalMs: environment.HEALTH_CHECK_INTERVAL_MS ?? 6 * 60 * 60_000,
      healthCleanupIntervalMs: environment.HEALTH_CLEANUP_INTERVAL_MS ?? 7 * 24 * 60 * 60_000,
      healthRetentionDays: environment.HEALTH_RETENTION_DAYS ?? 120,
    },
    conversion: {
      service: service(
        environment,
        kind,
        "CONVERSION_SERVICE_URL",
        "CONVERSION_REQUEST_TIMEOUT_MS",
      ),
      libreOfficePath: environment.LIBREOFFICE_PATH?.trim() || "libreoffice",
      maxInputBytes: environment.CONVERSION_MAX_INPUT_BYTES ?? 50 * 1024 * 1024,
      maxOutputBytes: environment.CONVERSION_MAX_OUTPUT_BYTES ?? 100 * 1024 * 1024,
      timeoutMs: environment.CONVERSION_TIMEOUT_MS ?? 60_000,
      concurrency: environment.CONVERSION_CONCURRENCY ?? 2,
      maxQueuedPerAdapter: environment.CONVERSION_MAX_QUEUED_PER_ADAPTER ?? 32,
      allowChromiumNoSandbox,
    },
    ai: {
      defaultModel: environment.DEFAULT_MAIN_MODEL?.trim() || undefined,
      requestTimeoutMs: environment.AI_REQUEST_TIMEOUT_MS ?? 60_000,
      allowLocalHttpCustomEndpoints:
        kind === "development" && parseBoolean(environment.AI_ALLOW_LOCAL_HTTP_ENDPOINTS),
      credentialEncryption,
      anthropic: provider(environment.ANTHROPIC_API_KEY),
      openai: provider(environment.OPENAI_API_KEY),
      google: provider(environment.GOOGLE_GENERATIVE_AI_API_KEY),
    },
  });
  return deepFreeze(parsed);
}
