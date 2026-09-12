import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checkerPath = relative(repositoryRoot, fileURLToPath(import.meta.url));
const active = "active";
const documented = "documented";

const environmentContracts = {
  backend: {
    files: [".env.example", "backend/.env.example"],
    preamble: [
      "Prism backend environment example.",
      "Backend processes load backend/.env.",
      "Copy either repository example to backend/.env.",
      "Required credentials are intentionally blank and startup fails until each is populated.",
      "Generate every strong secret independently with at least 32 UTF-8 bytes and eight distinct characters.",
      "Authentication, signing, and AI keyring secrets must be pairwise distinct and avoid weak placeholder words.",
    ],
    sections: [
      {
        title: "Runtime",
        variables: [
          [
            "NODE_ENV",
            active,
            "development",
            "Optional runtime mode. Defaults to development and accepts development, test, or production.",
          ],
          ["PORT", active, "3001", "Optional HTTP port. Defaults to 3001."],
          [
            "TRUST_PROXY_HOPS",
            documented,
            "0",
            "Optional trusted proxy hop count. Defaults to 0; production accepts only 0 or 1.",
          ],
          [
            "SHUTDOWN_TIMEOUT_MS",
            documented,
            "10000",
            "Optional API shutdown grace period in milliseconds. Defaults to 10000.",
          ],
          [
            "RENDER",
            documented,
            "",
            "Optional Render detection flag. Omission is false; a truthy value applies Render-safe storage restrictions.",
          ],
          [
            "RENDER_SERVICE_ID",
            documented,
            "",
            "Optional Render-provided service identifier. No default; its presence forbids local storage.",
          ],
          [
            "RENDER_EXTERNAL_URL",
            documented,
            "",
            "Optional Render-provided public URL. No default; its presence forbids local storage.",
          ],
        ],
      },
      {
        title: "Database and tooling",
        variables: [
          [
            "DATABASE_URL",
            active,
            "postgresql://prism@localhost:5432/prism",
            "Required PostgreSQL URL. This passwordless value targets a local prism database.",
          ],
          [
            "PG_CONNECTION_TIMEOUT_MS",
            documented,
            "5000",
            "Optional database connection timeout in milliseconds. Defaults to 5000.",
          ],
          [
            "PG_IDLE_TIMEOUT_MS",
            documented,
            "30000",
            "Optional database idle timeout in milliseconds. Defaults to 30000.",
          ],
          [
            "PG_QUERY_TIMEOUT_MS",
            documented,
            "10000",
            "Optional database query timeout in milliseconds. Defaults to 10000.",
          ],
          [
            "PG_STATEMENT_TIMEOUT_MS",
            documented,
            "10000",
            "Optional database statement timeout in milliseconds. Defaults to 10000.",
          ],
          [
            "ADMIN_EMAIL",
            documented,
            "",
            "Required only when the admin seed command receives no email argument. No default.",
          ],
        ],
      },
      {
        title: "Better Auth, origins, and Google OAuth",
        variables: [
          [
            "BETTER_AUTH_URL",
            active,
            "http://localhost:3001",
            "Optional auth origin. Defaults from PORT; test and production require HTTPS.",
          ],
          [
            "FRONTEND_URL",
            active,
            "http://localhost:5173",
            "Optional primary frontend origin. Development defaults to localhost; test and production require HTTPS.",
          ],
          [
            "CORS_ALLOWED_ORIGINS",
            documented,
            "",
            "Optional comma-separated extra origins. Defaults to none; test and production require HTTPS.",
          ],
          [
            "SHARE_INVITE_EXPIRY_DAYS",
            documented,
            "7",
            "Optional share invitation lifetime in days. Defaults to 7.",
          ],
          [
            "GOOGLE_CLIENT_ID",
            documented,
            "",
            "Conditional Google OAuth client identifier. No default; configure it with GOOGLE_CLIENT_SECRET.",
          ],
          [
            "GOOGLE_CLIENT_SECRET",
            documented,
            "",
            "Conditional Google OAuth client secret. No default; configure it with GOOGLE_CLIENT_ID.",
          ],
        ],
      },
      {
        title: "Independent secrets",
        variables: [
          [
            "BETTER_AUTH_SECRET",
            active,
            "",
            "Required unique random Better Auth secret of at least 32 bytes. No default.",
          ],
          [
            "AUTH_OTP_SECRET",
            active,
            "",
            "Required unique random OTP secret of at least 32 bytes. No default.",
          ],
          [
            "DOWNLOAD_SIGNING_SECRET",
            active,
            "",
            "Required unique random download-signing secret of at least 32 bytes. No default.",
          ],
        ],
      },
      {
        title: "Local, S3, and R2 storage",
        variables: [
          [
            "STORAGE_PROVIDER",
            documented,
            "local",
            "Optional storage mode. Defaults to local in development, inferred S3 when configured, and disabled otherwise.",
          ],
          [
            "LOCAL_STORAGE_PATH",
            active,
            "./data",
            "Conditional local storage directory. Defaults to ./data and is forbidden in production or on Render.",
          ],
          [
            "PUBLIC_API_URL",
            documented,
            "http://localhost:3001",
            "Optional local-file public API URL. Defaults to BETTER_AUTH_URL and follows the same HTTPS policy.",
          ],
          [
            "OBJECT_STORE_ENDPOINT",
            documented,
            "https://s3.example.com",
            "Conditional generic S3 endpoint. No default; configure all required OBJECT_STORE fields and no R2 aliases.",
          ],
          [
            "OBJECT_STORE_REGION",
            documented,
            "us-east-1",
            "Optional generic S3 region. Defaults to us-east-1.",
          ],
          [
            "OBJECT_STORE_FORCE_PATH_STYLE",
            documented,
            "false",
            "Optional generic S3 path-style switch. Defaults to false.",
          ],
          [
            "OBJECT_STORE_ACCESS_KEY_ID",
            documented,
            "",
            "Conditional generic S3 access key identifier. No default; configure it with the endpoint, secret, and bucket.",
          ],
          [
            "OBJECT_STORE_SECRET_ACCESS_KEY",
            documented,
            "",
            "Conditional generic S3 secret access key. No default; configure it with the endpoint, access key, and bucket.",
          ],
          [
            "OBJECT_STORE_BUCKET",
            documented,
            "",
            "Conditional generic S3 bucket. No default; configure it with the endpoint and credentials.",
          ],
          [
            "OBJECT_STORE_REQUEST_TIMEOUT_MS",
            documented,
            "60000",
            "Optional S3 or R2 request timeout in milliseconds. Defaults to 60000.",
          ],
          [
            "R2_ENDPOINT_URL",
            documented,
            "https://r2.example.com",
            "Conditional R2 endpoint. No default; configure the R2 credential pair and no generic OBJECT_STORE fields.",
          ],
          ["R2_REGION", documented, "auto", "Optional R2 region. Defaults to auto."],
          [
            "R2_ACCESS_KEY_ID",
            documented,
            "",
            "Conditional R2 access key identifier. No default; configure it with the endpoint and secret key.",
          ],
          [
            "R2_SECRET_ACCESS_KEY",
            documented,
            "",
            "Conditional R2 secret access key. No default; configure it with the endpoint and access key.",
          ],
          [
            "R2_BUCKET_NAME",
            documented,
            "prism",
            "Optional R2 bucket name. Defaults to prism when the R2 credential set is selected.",
          ],
        ],
      },
      {
        title: "Console, SMTP, and Resend mail",
        variables: [
          [
            "MAIL_PROVIDER",
            documented,
            "console",
            "Optional provider selector. Omission selects one configured provider or console; simultaneous providers are rejected.",
          ],
          ["MAIL_FROM", documented, "", "Required sender for Resend or SMTP. No default."],
          [
            "EMAIL_REPLY_TO",
            documented,
            "",
            "Optional reply-to address for Resend or SMTP. No default.",
          ],
          [
            "EMAIL_DISPLAY_NAME",
            documented,
            "Prism Legal",
            "Optional sender display name for Resend or SMTP. Defaults to Prism Legal.",
          ],
          [
            "EMAIL_SEND_TIMEOUT_MS",
            documented,
            "10000",
            "Optional provider send timeout in milliseconds. Defaults to 10000.",
          ],
          [
            "RESEND_API_KEY",
            documented,
            "",
            "Conditional Resend API key. No default; its presence selects Resend when MAIL_PROVIDER is omitted.",
          ],
          [
            "SMTP_HOST",
            documented,
            "smtp.example.com",
            "Conditional SMTP host. No default; its presence selects SMTP when other provider settings are omitted.",
          ],
          ["SMTP_PORT", documented, "587", "Optional SMTP port. Defaults to 587."],
          [
            "SMTP_SECURE",
            documented,
            "false",
            "Optional SMTP TLS-on-connect switch. Defaults to false.",
          ],
          [
            "SMTP_USERNAME",
            documented,
            "",
            "Optional SMTP username. No default; configure it together with SMTP_PASSWORD.",
          ],
          [
            "SMTP_PASSWORD",
            documented,
            "",
            "Optional SMTP password. No default; configure it together with SMTP_USERNAME.",
          ],
        ],
      },
      {
        title: "RAG retrieval service",
        variables: [
          [
            "QDRANT_URL",
            documented,
            "https://qdrant.example.com",
            "Optional Qdrant cluster URL for RAG ingest and search. Omission disables RAG. Set it together with QDRANT_API_KEY. Production and test require HTTPS; local development allows loopback HTTP.",
          ],
          [
            "QDRANT_API_KEY",
            documented,
            "",
            "Optional Qdrant API key for RAG ingest and search. Required together with QDRANT_URL. Leave both unset to disable RAG.",
          ],
          [
            "RAG_REQUEST_TIMEOUT_MS",
            documented,
            "15000",
            "Optional Qdrant request timeout in milliseconds. Defaults to 15000 when RAG is enabled.",
          ],
        ],
      },
      {
        title: "Document conversion",
        variables: [
          [
            "CONVERSION_SERVICE_URL",
            documented,
            "https://conversion.example.com",
            "Optional remote conversion URL. Omission disables it; the current converter still selects local adapters.",
          ],
          [
            "CONVERSION_REQUEST_TIMEOUT_MS",
            documented,
            "15000",
            "Optional remote conversion timeout in milliseconds. It is parsed only when the remote URL is set.",
          ],
          [
            "LIBREOFFICE_PATH",
            documented,
            "libreoffice",
            "Optional LibreOffice executable path. Defaults to libreoffice.",
          ],
          [
            "CONVERSION_MAX_INPUT_BYTES",
            documented,
            "52428800",
            "Optional conversion input limit in bytes. Defaults to 52428800 and accepts at most 1073741824.",
          ],
          [
            "CONVERSION_MAX_OUTPUT_BYTES",
            documented,
            "104857600",
            "Optional conversion output limit in bytes. Defaults to 104857600 and accepts at most 2147483648.",
          ],
          [
            "CONVERSION_TIMEOUT_MS",
            documented,
            "60000",
            "Optional local conversion timeout in milliseconds. Defaults to 60000 and accepts at most 600000.",
          ],
          [
            "CONVERSION_CONCURRENCY",
            documented,
            "2",
            "Optional concurrency per local conversion adapter. Defaults to 2.",
          ],
          [
            "CONVERSION_MAX_QUEUED_PER_ADAPTER",
            documented,
            "32",
            "Optional queued-job limit per local conversion adapter. Defaults to 32.",
          ],
          [
            "CONVERSION_CHROMIUM_SANDBOX_MODE",
            documented,
            "enabled",
            "Optional Chromium sandbox mode. Defaults to enabled and accepts enabled or disabled.",
          ],
          [
            "CONVERSION_CHROMIUM_NO_SANDBOX_ACKNOWLEDGED",
            documented,
            "false",
            "Conditional no-sandbox acknowledgment. Defaults to false and must be true only when sandboxing is disabled.",
          ],
        ],
      },
      {
        title: "Jobs and health checks",
        variables: [
          [
            "WORKER_CONCURRENCY",
            documented,
            "4",
            "Optional worker concurrency. Defaults to 4 and accepts at most 32.",
          ],
          [
            "WORKER_POLL_INTERVAL_MS",
            documented,
            "1000",
            "Optional worker polling interval in milliseconds. Defaults to 1000.",
          ],
          [
            "WORKER_LEASE_DURATION_MS",
            documented,
            "60000",
            "Optional worker lease duration in milliseconds. Defaults to 60000.",
          ],
          [
            "WORKER_SHUTDOWN_TIMEOUT_MS",
            documented,
            "",
            "Optional worker shutdown grace period. Defaults to SHUTDOWN_TIMEOUT_MS, then 10000.",
          ],
          [
            "HEALTHCHECK_API_URL",
            documented,
            "http://localhost:3001/health",
            "Optional worker health target. Defaults to BETTER_AUTH_URL with a trailing /health path.",
          ],
          [
            "HEALTH_CHECK_INTERVAL_MS",
            documented,
            "21600000",
            "Optional health-check scheduling interval in milliseconds. Defaults to 21600000.",
          ],
          [
            "HEALTH_CLEANUP_INTERVAL_MS",
            documented,
            "604800000",
            "Optional health-history cleanup interval in milliseconds. Defaults to 604800000.",
          ],
          [
            "HEALTH_RETENTION_DAYS",
            documented,
            "120",
            "Optional health-history retention in days. Defaults to 120.",
          ],
        ],
      },
      {
        title: "Rate limits",
        variables: [
          [
            "RATE_LIMIT_GENERAL_WINDOW_MINUTES",
            documented,
            "15",
            "Optional general request window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_GENERAL_MAX",
            documented,
            "300",
            "Optional general request maximum per window. Defaults to 300.",
          ],
          [
            "RATE_LIMIT_CHAT_WINDOW_MINUTES",
            documented,
            "15",
            "Optional chat request window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_CHAT_MAX",
            documented,
            "30",
            "Optional chat request maximum per window. Defaults to 30.",
          ],
          [
            "RATE_LIMIT_CHAT_CREATE_WINDOW_MINUTES",
            documented,
            "15",
            "Optional chat-creation window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_CHAT_CREATE_MAX",
            documented,
            "60",
            "Optional chat-creation maximum per window. Defaults to 60.",
          ],
          [
            "RATE_LIMIT_UPLOAD_WINDOW_HOURS",
            documented,
            "1",
            "Optional upload window in hours. Defaults to 1.",
          ],
          [
            "RATE_LIMIT_UPLOAD_MAX",
            documented,
            "50",
            "Optional upload maximum per window. Defaults to 50.",
          ],
          [
            "RATE_LIMIT_COMPLIANCE_WINDOW_MINUTES",
            documented,
            "15",
            "Optional compliance request window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_COMPLIANCE_MAX",
            documented,
            "100",
            "Optional compliance request maximum per window. Defaults to 100.",
          ],
          [
            "RATE_LIMIT_INVITATION_LOOKUP_WINDOW_MINUTES",
            documented,
            "15",
            "Optional invitation lookup window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_INVITATION_LOOKUP_MAX",
            documented,
            "60",
            "Optional invitation lookup maximum per window. Defaults to 60.",
          ],
          [
            "RATE_LIMIT_INVITATION_DECISION_WINDOW_MINUTES",
            documented,
            "15",
            "Optional invitation decision window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_INVITATION_DECISION_MAX",
            documented,
            "20",
            "Optional invitation decision maximum per window. Defaults to 20.",
          ],
          [
            "RATE_LIMIT_INVITATION_SEND_WINDOW_HOURS",
            documented,
            "1",
            "Optional invitation send window in hours. Defaults to 1.",
          ],
          [
            "RATE_LIMIT_INVITATION_SEND_MAX",
            documented,
            "30",
            "Optional invitation send maximum per window. Defaults to 30.",
          ],
          [
            "RATE_LIMIT_PUBLIC_APPROVAL_READ_WINDOW_MINUTES",
            documented,
            "15",
            "Optional public approval read window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_PUBLIC_APPROVAL_READ_MAX",
            documented,
            "60",
            "Optional public approval read maximum per window. Defaults to 60.",
          ],
          [
            "RATE_LIMIT_PUBLIC_APPROVAL_DECISION_WINDOW_MINUTES",
            documented,
            "15",
            "Optional public approval decision window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_PUBLIC_APPROVAL_DECISION_MAX",
            documented,
            "10",
            "Optional public approval decision maximum per window. Defaults to 10.",
          ],
          [
            "RATE_LIMIT_TABULAR_PROMPT_WINDOW_MINUTES",
            documented,
            "15",
            "Optional tabular prompt window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_TABULAR_PROMPT_MAX",
            documented,
            "30",
            "Optional tabular prompt maximum per window. Defaults to 30.",
          ],
          [
            "RATE_LIMIT_TABULAR_REGENERATE_WINDOW_MINUTES",
            documented,
            "15",
            "Optional tabular regeneration window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_TABULAR_REGENERATE_MAX",
            documented,
            "20",
            "Optional tabular regeneration maximum per window. Defaults to 20.",
          ],
          [
            "RATE_LIMIT_FILE_VERSION_READ_WINDOW_MINUTES",
            documented,
            "15",
            "Optional file-version read window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_FILE_VERSION_READ_MAX",
            documented,
            "120",
            "Optional file-version read maximum per window. Defaults to 120.",
          ],
          [
            "RATE_LIMIT_PROVIDER_CHECK_WINDOW_MINUTES",
            documented,
            "15",
            "Optional provider-check window in minutes. Defaults to 15.",
          ],
          [
            "RATE_LIMIT_PROVIDER_CHECK_MAX",
            documented,
            "10",
            "Optional provider-check maximum per window. Defaults to 10.",
          ],
        ],
      },
      {
        title: "AI credentials, providers, and models",
        variables: [
          [
            "AI_CREDENTIAL_ACTIVE_KEY_ID",
            active,
            "v1",
            "Optional active keyring identifier. Defaults to v1 and must name an entry in the keyring.",
          ],
          [
            "AI_CREDENTIAL_ENCRYPTION_KEYS",
            active,
            "",
            "Required JSON keyring of unique random secrets of at least 32 bytes. No default.",
          ],
          [
            "AI_REQUEST_TIMEOUT_MS",
            documented,
            "60000",
            "Optional server-provider request timeout in milliseconds. Defaults to 60000.",
          ],
          [
            "AI_ALLOW_LOCAL_HTTP_ENDPOINTS",
            documented,
            "false",
            "Optional custom-provider HTTP allowance. Defaults to false and only permits loopback HTTP in development.",
          ],
          ["ANTHROPIC_API_KEY", documented, "", "Optional Anthropic server API key. No default."],
          ["OPENAI_API_KEY", documented, "", "Optional OpenAI server API key. No default."],
          [
            "GOOGLE_GENERATIVE_AI_API_KEY",
            documented,
            "",
            "Optional Google AI server API key. No default.",
          ],
          [
            "DEFAULT_MAIN_MODEL",
            documented,
            "",
            "Optional default main model identifier. Unset by default and the only server model selection read from environment.",
          ],
        ],
      },
    ],
  },
  frontend: {
    files: ["frontend/.env.example"],
    preamble: [
      "Prism frontend environment example.",
      "Vite loads frontend/.env for local overrides.",
    ],
    sections: [
      {
        title: "API",
        variables: [
          [
            "VITE_API_BASE_URL",
            active,
            "http://localhost:3001",
            "Optional backend API base URL. The frontend falls back to http://localhost:3001.",
          ],
        ],
      },
    ],
  },
};

const expectedBackendKeyCount = 105;
const expectedFrontendKeyCount = 1;
const environmentNamePattern = /^[A-Z][A-Z0-9_]*$/;
const frontendEnvironmentNamePattern = /^VITE_[A-Z][A-Z0-9_]*$/;
const secretLookingFrontendNamePattern =
  /(?:^|_)(?:API_KEY|ACCESS_KEY|CREDENTIALS?|KEY|PASSWORD|PRIVATE|SECRET|TOKEN)(?:_|$)/;
const credentialNamePattern =
  /(?:^|_)(?:API_KEY|ACCESS_KEY_ID|CLIENT_ID|PASSWORD|PRIVATE_KEY|SECRET|TOKEN|USERNAME)(?:_|$)/;
const tokenOrPemPattern =
  /-----BEGIN(?: [A-Z0-9]+)+-----|(?:^|[^A-Za-z0-9])eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|(?:^|[^A-Za-z0-9])(?:sk|rk|github_pat|gh[pousr]|xox[baprs]|AKIA|ASIA)[-_][A-Za-z0-9_-]{12,}/i;
const requiredActiveNames = new Set([
  "AI_CREDENTIAL_ENCRYPTION_KEYS",
  "AUTH_OTP_SECRET",
  "BETTER_AUTH_SECRET",
  "DATABASE_URL",
  "DOWNLOAD_SIGNING_SECRET",
]);
const credentialNames = new Set([
  "AI_CREDENTIAL_ENCRYPTION_KEYS",
  "GOOGLE_CLIENT_ID",
  "OBJECT_STORE_ACCESS_KEY_ID",
  "R2_ACCESS_KEY_ID",
  "SMTP_USERNAME",
]);
const ignoredSourceDirectories = new Set([
  "__tests__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "test",
  "tests",
]);
const sourceExtensions = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const viteBuiltIns = new Set(["BASE_URL", "DEV", "MODE", "PROD", "SSR"]);
const allowedBackendDynamicAccess = new Map([
  [
    "backend/src/config.ts",
    new Map([
      ["parseInteger", new Set(["name"])],
      ["parseOptionalPair", new Set(["firstName", "secondName"])],
      ["service", new Set(["name", "timeoutName"])],
    ]),
  ],
  [
    "backend/src/storage/s3ObjectStoreConfig.ts",
    new Map([["value", new Set(["primary", "alias"])]]),
  ],
]);
const helperLiteralFiles = new Set([
  "backend/src/config.ts",
  "backend/src/storage/s3ObjectStoreConfig.ts",
]);
const fingerprintTargets = [
  {
    id: "backend-config",
    path: "backend/src/config.ts",
    declarations: null,
    expected: "f87216507ba051ae77a954f996c20b8d998492cd4bfa3a99abb175a676d2ad10",
  },
  {
    id: "backend-secret-policy",
    path: "backend/src/lib/security.ts",
    declarations: null,
    expected: "4e834103edc7f061da8f21d8ab753231c1d7798d09dd6bc9da9cd2f6b35b8af0",
  },
  {
    id: "backend-object-store-config",
    path: "backend/src/storage/s3ObjectStoreConfig.ts",
    declarations: null,
    expected: "2de84b16ba0707553411fb8a1055f1523dc37aa85f339c388d10e82ae1fa22f1",
  },
  {
    id: "backend-seed-admin-input",
    path: "backend/src/scripts/seedAdminInput.ts",
    declarations: null,
    expected: "220535586215a3fec1b6b7686e3babfca1ae5425fe8308c2181ad05bf2f9f3ba",
  },
  {
    id: "frontend-api-base-url",
    path: "frontend/src/client/lib/apiTransport.ts",
    declarations: ["localApiBaseUrl", "resolveApiBaseUrl"],
    expected: "89435b1842d56dd7a2c6e6c17e9f30234c441bc6d93ef73d147018d06fbb19ee",
  },
];

function addFinding(findings, code, path, message) {
  findings.push({ code, path, message });
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortFindings(findings) {
  const uniqueFindings = new Map(
    findings.map((finding) => [
      `${finding.path}\u0000${finding.code}\u0000${finding.message}`,
      finding,
    ]),
  );
  return [...uniqueFindings.values()].sort(
    (left, right) =>
      compareText(left.path, right.path) ||
      compareText(left.code, right.code) ||
      compareText(left.message, right.message),
  );
}

function renderContract(contract) {
  const lines = contract.preamble.map((line) => `# ${line}`);
  for (const section of contract.sections) {
    lines.push("", `# ${section.title}`);
    for (const [name, assignment, value, description] of section.variables) {
      lines.push(`# ${description}`);
      lines.push(`${assignment === documented ? "# " : ""}${name}=${value}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function isCredentialName(name) {
  return credentialNames.has(name) || credentialNamePattern.test(name);
}

function hasPasswordInDatabaseUrl(value) {
  if (!value) return false;
  try {
    return Boolean(new URL(value).password);
  } catch {
    return false;
  }
}

function validateValueSafety(name, value, path, line, findings) {
  const location = line === undefined ? path : `${path}:${line}`;
  if (isCredentialName(name) && value !== "") {
    addFinding(findings, "credential-value", location, `${name} must have a blank example value`);
  }
  if (name === "DATABASE_URL" && hasPasswordInDatabaseUrl(value)) {
    addFinding(findings, "database-password", location, "DATABASE_URL must not contain a password");
  }
  if (tokenOrPemPattern.test(value)) {
    addFinding(findings, "token-like-value", location, `${name} contains token-like material`);
  }
}

function validateContract(name, contract, findings) {
  const seen = new Set();
  for (const section of contract.sections) {
    if (!section.title.trim()) {
      addFinding(findings, "contract-section", checkerPath, `${name} has an unnamed section`);
    }
    for (const [variableName, assignment, value, description] of section.variables) {
      if (!environmentNamePattern.test(variableName)) {
        addFinding(
          findings,
          "contract-name",
          checkerPath,
          `${name} contains invalid variable name ${variableName}`,
        );
      }
      if (seen.has(variableName)) {
        addFinding(
          findings,
          "contract-duplicate",
          checkerPath,
          `${name} contains duplicate variable ${variableName}`,
        );
      }
      seen.add(variableName);
      if (assignment !== active && assignment !== documented) {
        addFinding(
          findings,
          "contract-assignment",
          checkerPath,
          `${variableName} has an invalid assignment state`,
        );
      }
      if (typeof value !== "string" || /[\r\n]/.test(value)) {
        addFinding(
          findings,
          "contract-value",
          checkerPath,
          `${variableName} has an invalid example value`,
        );
      } else {
        validateValueSafety(variableName, value, checkerPath, undefined, findings);
      }
      if (typeof description !== "string" || !description.trim()) {
        addFinding(
          findings,
          "contract-description",
          checkerPath,
          `${variableName} needs a description`,
        );
      }
      if (requiredActiveNames.has(variableName) && assignment !== active) {
        addFinding(
          findings,
          "required-assignment",
          checkerPath,
          `${variableName} must remain an active assignment`,
        );
      }
    }
  }
  return seen;
}

function readBytes(path, findings) {
  try {
    return readFileSync(resolve(repositoryRoot, path));
  } catch {
    addFinding(findings, "missing-file", path, "file is missing or unreadable");
    return null;
  }
}

function readSource(path, findings) {
  const bytes = readBytes(path, findings);
  return bytes === null ? null : bytes.toString("utf8");
}

function scriptKind(path) {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function parseSource(path, source, findings) {
  const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(path));
  if (parsed.parseDiagnostics?.length) {
    addFinding(findings, "source-parse", path, "source could not be parsed cleanly");
  }
  return parsed;
}

function collectFiles(directory, include) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return ignoredSourceDirectories.has(entry.name) ? [] : collectFiles(path, include);
      }
      return entry.isFile() && include(path) ? [path] : [];
    });
}

function isProductionSource(path) {
  return (
    sourceExtensions.has(extname(path)) &&
    !/\.(?:spec|test)\.[^.]+$/.test(path) &&
    !/[\\/]__tests__[\\/]/.test(path)
  );
}

function isEnvironmentIdentifier(node) {
  return ts.isIdentifier(node) && node.text === "environment";
}

function isProcessEnvironment(node) {
  return (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "process" &&
    node.name.text === "env"
  );
}

function isBackendEnvironmentExpression(node) {
  return isEnvironmentIdentifier(node) || isProcessEnvironment(node);
}

function enclosingFunctionName(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
  }
  return null;
}

function dynamicBackendAccessIsAllowed(path, node) {
  const allowedFunctions = allowedBackendDynamicAccess.get(path);
  const functionName = enclosingFunctionName(node);
  const allowedNames = functionName ? allowedFunctions?.get(functionName) : undefined;
  return Boolean(
    allowedNames &&
    node.argumentExpression &&
    ts.isIdentifier(node.argumentExpression) &&
    allowedNames.has(node.argumentExpression.text),
  );
}

function discoverBackendKeys(findings) {
  const backendSourceRoot = resolve(repositoryRoot, "backend/src");
  const files = collectFiles(backendSourceRoot, isProductionSource);
  files.push(resolve(repositoryRoot, "backend/drizzle.config.ts"));
  const keys = new Set();

  for (const absolutePath of files.sort()) {
    const path = relative(repositoryRoot, absolutePath);
    const source = readSource(path, findings);
    if (source === null) continue;
    const parsed = parseSource(path, source, findings);

    const visit = (node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        isProcessEnvironment(node.initializer)
      ) {
        addFinding(
          findings,
          "backend-env-alias",
          path,
          "unsupported process.env alias requires explicit checker support",
        );
      }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isObjectBindingPattern(node.name) &&
        node.initializer &&
        isBackendEnvironmentExpression(node.initializer)
      ) {
        addFinding(
          findings,
          "backend-env-destructure",
          path,
          "unsupported environment destructuring requires explicit checker support",
        );
      }
      if (ts.isPropertyAccessExpression(node) && isBackendEnvironmentExpression(node.expression)) {
        if (environmentNamePattern.test(node.name.text)) {
          keys.add(node.name.text);
        } else {
          addFinding(
            findings,
            "backend-env-access",
            path,
            `unsupported environment property ${node.name.text}`,
          );
        }
      }

      if (ts.isElementAccessExpression(node) && isBackendEnvironmentExpression(node.expression)) {
        const argument = node.argumentExpression;
        if (argument && ts.isStringLiteralLike(argument)) {
          if (environmentNamePattern.test(argument.text)) {
            keys.add(argument.text);
          } else {
            addFinding(
              findings,
              "backend-env-access",
              path,
              `unsupported environment key ${argument.text}`,
            );
          }
        } else if (!dynamicBackendAccessIsAllowed(path, node)) {
          addFinding(
            findings,
            "backend-dynamic-env",
            path,
            "unsupported dynamic environment access requires explicit checker support",
          );
        }
      }

      if (
        helperLiteralFiles.has(path) &&
        ts.isStringLiteralLike(node) &&
        environmentNamePattern.test(node.text)
      ) {
        keys.add(node.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed);
  }

  return keys;
}

function isImportMeta(node) {
  return (
    ts.isMetaProperty(node) &&
    node.keywordToken === ts.SyntaxKind.ImportKeyword &&
    node.name.text === "meta"
  );
}

function isImportMetaEnvironment(node) {
  return (
    ts.isPropertyAccessExpression(node) && isImportMeta(node.expression) && node.name.text === "env"
  );
}

function validateFrontendName(name, path, findings) {
  if (frontendEnvironmentNamePattern.test(name) && secretLookingFrontendNamePattern.test(name)) {
    addFinding(
      findings,
      "frontend-secret-name",
      path,
      `${name} is secret-looking and must not be exposed through Vite`,
    );
  }
}

function staticPropertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  if (ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)) {
    return name.expression.text;
  }
  return null;
}

function viteOverrideName(node) {
  if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
    return staticPropertyName(node.name);
  }
  if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
    return null;
  }
  if (ts.isPropertyAccessExpression(node.left)) return node.left.name.text;
  if (
    ts.isElementAccessExpression(node.left) &&
    node.left.argumentExpression &&
    ts.isStringLiteralLike(node.left.argumentExpression)
  ) {
    return node.left.argumentExpression.text;
  }
  return null;
}

function discoverFrontendKeys(findings) {
  const frontendRoot = resolve(repositoryRoot, "frontend");
  const sourceFiles = collectFiles(resolve(frontendRoot, "src"), isProductionSource);
  const htmlFiles = collectFiles(frontendRoot, (path) => extname(path) === ".html");
  const viteConfigFiles = collectFiles(frontendRoot, (path) =>
    /^vite\.config\.[cm]?[jt]s$/.test(path.split(/[\\/]/).at(-1) ?? ""),
  );
  const keys = new Set();

  for (const absolutePath of sourceFiles) {
    const path = relative(repositoryRoot, absolutePath);
    const source = readSource(path, findings);
    if (source === null) continue;
    const parsed = parseSource(path, source, findings);
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (node.expression.text === "loadEnv") {
          addFinding(
            findings,
            "frontend-load-env",
            path,
            "loadEnv usage requires explicit checker support",
          );
        }
      }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isObjectBindingPattern(node.name) &&
        node.initializer &&
        isImportMetaEnvironment(node.initializer)
      ) {
        addFinding(
          findings,
          "frontend-env-destructure",
          path,
          "unsupported import.meta.env destructuring requires explicit checker support",
        );
      }
      if (isImportMetaEnvironment(node)) {
        const parentReadsProperty =
          (ts.isPropertyAccessExpression(node.parent) ||
            ts.isElementAccessExpression(node.parent)) &&
          node.parent.expression === node;
        const parentDestructures =
          ts.isVariableDeclaration(node.parent) && ts.isObjectBindingPattern(node.parent.name);
        if (!parentReadsProperty && !parentDestructures) {
          addFinding(
            findings,
            "frontend-env-object",
            path,
            "whole import.meta.env usage requires explicit checker support",
          );
        }
      }
      if (ts.isPropertyAccessExpression(node) && isImportMetaEnvironment(node.expression)) {
        const name = node.name.text;
        if (frontendEnvironmentNamePattern.test(name)) {
          keys.add(name);
          validateFrontendName(name, path, findings);
        } else if (!viteBuiltIns.has(name)) {
          addFinding(
            findings,
            "frontend-env-name",
            path,
            `unsupported non-VITE environment name ${name}`,
          );
        }
      }
      if (ts.isElementAccessExpression(node) && isImportMetaEnvironment(node.expression)) {
        const argument = node.argumentExpression;
        if (!argument || !ts.isStringLiteralLike(argument)) {
          addFinding(
            findings,
            "frontend-dynamic-env",
            path,
            "unsupported dynamic import.meta.env access requires explicit checker support",
          );
        } else {
          const name = argument.text;
          if (frontendEnvironmentNamePattern.test(name)) {
            keys.add(name);
            validateFrontendName(name, path, findings);
          } else if (!viteBuiltIns.has(name)) {
            addFinding(
              findings,
              "frontend-env-name",
              path,
              `unsupported non-VITE environment name ${name}`,
            );
          }
        }
      }
      if (ts.isPropertyAccessExpression(node) && isProcessEnvironment(node.expression)) {
        if (node.name.text.startsWith("VITE_")) {
          addFinding(
            findings,
            "frontend-process-env",
            path,
            `${node.name.text} must be read through import.meta.env`,
          );
        }
      }
      if (ts.isElementAccessExpression(node) && isProcessEnvironment(node.expression)) {
        const argument = node.argumentExpression;
        if (argument && ts.isStringLiteralLike(argument) && argument.text.startsWith("VITE_")) {
          addFinding(
            findings,
            "frontend-process-env",
            path,
            `${argument.text} must be read through import.meta.env`,
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed);
  }

  for (const absolutePath of htmlFiles) {
    const path = relative(repositoryRoot, absolutePath);
    const source = readSource(path, findings);
    if (source === null) continue;
    for (const match of source.matchAll(/%([^%\r\n]+)%/g)) {
      const name = match[1];
      if (!name.startsWith("VITE_")) continue;
      if (!frontendEnvironmentNamePattern.test(name)) {
        addFinding(
          findings,
          "frontend-env-name",
          path,
          `unsupported Vite HTML environment name ${name}`,
        );
        continue;
      }
      keys.add(name);
      validateFrontendName(name, path, findings);
    }
  }

  for (const absolutePath of viteConfigFiles) {
    const path = relative(repositoryRoot, absolutePath);
    const source = readSource(path, findings);
    if (source === null) continue;
    const parsed = parseSource(path, source, findings);
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "loadEnv"
      ) {
        addFinding(
          findings,
          "frontend-load-env",
          path,
          "loadEnv usage requires explicit checker support",
        );
      }
      const overrideName = viteOverrideName(node);
      if (overrideName === "envDir" || overrideName === "envPrefix") {
        addFinding(
          findings,
          "vite-env-override",
          path,
          `${overrideName} overrides require checker redesign`,
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed);
  }

  return keys;
}

function parseExample(path, expected, findings) {
  const bytes = readBytes(path, findings);
  if (bytes === null) return null;
  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    addFinding(findings, "example-bom", path, "UTF-8 BOM is not allowed");
  }
  const source = bytes.toString("utf8");
  if (tokenOrPemPattern.test(source)) {
    addFinding(findings, "token-like-content", path, "file contains token-like material");
  }
  if (source.includes("\r\n") || source.includes("\r")) {
    addFinding(findings, "example-crlf", path, "only LF line endings are allowed");
  }
  if (!source.endsWith("\n")) {
    addFinding(findings, "example-final-newline", path, "final newline is required");
  }
  if (!bytes.equals(Buffer.from(expected))) {
    addFinding(
      findings,
      "example-noncanonical",
      path,
      "content does not match the canonical model",
    );
  }

  const declarations = new Map();
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    const activeMatch = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    const documentedMatch = /^# ([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    const match = activeMatch ?? documentedMatch;
    if (match) {
      const [, name, value] = match;
      const previousLine = declarations.get(name);
      if (previousLine !== undefined) {
        addFinding(
          findings,
          "example-duplicate",
          `${path}:${lineNumber}`,
          `${name} duplicates its declaration on line ${previousLine}`,
        );
      } else {
        declarations.set(name, lineNumber);
      }
      validateValueSafety(name, value, path, lineNumber, findings);
    } else if (line.includes("=")) {
      addFinding(
        findings,
        "example-malformed",
        `${path}:${lineNumber}`,
        "malformed assignment-like line",
      );
    }
  }
  return new Set(declarations.keys());
}

function compareKeySets(leftLabel, left, rightLabel, right, path, findings) {
  for (const name of [...left].sort()) {
    if (!right.has(name)) {
      addFinding(
        findings,
        "missing-key",
        path,
        `${rightLabel} is missing ${name} from ${leftLabel}`,
      );
    }
  }
  for (const name of [...right].sort()) {
    if (!left.has(name)) {
      addFinding(
        findings,
        "extra-key",
        path,
        `${rightLabel} contains ${name}, which is absent from ${leftLabel}`,
      );
    }
  }
}

function normalizeTokens(source) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    source,
  );
  const tokens = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    const kind = ts.SyntaxKind[token];
    if (
      token === ts.SyntaxKind.StringLiteral ||
      token === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
      token === ts.SyntaxKind.TemplateHead ||
      token === ts.SyntaxKind.TemplateMiddle ||
      token === ts.SyntaxKind.TemplateTail
    ) {
      tokens.push(`${kind}:${JSON.stringify(scanner.getTokenValue())}`);
    } else if (token === ts.SyntaxKind.NumericLiteral) {
      tokens.push(`${kind}:${Number(scanner.getTokenText().replaceAll("_", ""))}`);
    } else {
      tokens.push(`${kind}:${scanner.getTokenText()}`);
    }
  }
  return tokens.join("\n");
}

function selectedFingerprintSource(target, source, findings) {
  if (target.declarations === null) return source;
  const parsed = parseSource(target.path, source, findings);
  const selected = new Map();
  for (const statement of parsed.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      if (target.declarations.includes(statement.name.text)) {
        selected.set(statement.name.text, statement.getText(parsed));
      }
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        target.declarations.includes(declaration.name.text)
      ) {
        selected.set(declaration.name.text, statement.getText(parsed));
      }
    }
  }
  for (const name of target.declarations) {
    if (!selected.has(name)) {
      addFinding(
        findings,
        "fingerprint-target",
        target.path,
        `fingerprint declaration ${name} is missing`,
      );
    }
  }
  return target.declarations.map((name) => selected.get(name) ?? "").join("\n");
}

function currentFingerprints(findings) {
  return fingerprintTargets.map((target) => {
    const source = readSource(target.path, findings);
    if (source === null) return { ...target, actual: null };
    const selectedSource = selectedFingerprintSource(target, source, findings);
    const actual = createHash("sha256").update(normalizeTokens(selectedSource)).digest("hex");
    return { ...target, actual };
  });
}

function checkFingerprints(findings) {
  for (const target of currentFingerprints(findings)) {
    if (target.actual !== null && target.actual !== target.expected) {
      const scope =
        target.declarations === null ? "environment authority" : target.declarations.join(" and ");
      addFinding(
        findings,
        "semantic-fingerprint",
        target.path,
        `${scope} semantics changed; review the environment contract and update its fingerprint`,
      );
    }
  }
}

function runChecks({ includeExamples }) {
  const findings = [];
  const backendContractKeys = validateContract(
    "backend contract",
    environmentContracts.backend,
    findings,
  );
  const frontendContractKeys = validateContract(
    "frontend contract",
    environmentContracts.frontend,
    findings,
  );
  if (backendContractKeys.size !== expectedBackendKeyCount) {
    addFinding(
      findings,
      "contract-count",
      checkerPath,
      `backend contract has ${backendContractKeys.size} keys instead of ${expectedBackendKeyCount}`,
    );
  }
  if (
    frontendContractKeys.size !== expectedFrontendKeyCount ||
    !frontendContractKeys.has("VITE_API_BASE_URL")
  ) {
    addFinding(
      findings,
      "contract-count",
      checkerPath,
      "frontend contract must contain only VITE_API_BASE_URL",
    );
  }
  for (const name of frontendContractKeys) {
    validateFrontendName(name, checkerPath, findings);
  }

  const backendSourceKeys = discoverBackendKeys(findings);
  const frontendSourceKeys = discoverFrontendKeys(findings);
  compareKeySets(
    "backend source",
    backendSourceKeys,
    "backend contract",
    backendContractKeys,
    checkerPath,
    findings,
  );
  compareKeySets(
    "frontend source",
    frontendSourceKeys,
    "frontend contract",
    frontendContractKeys,
    checkerPath,
    findings,
  );
  checkFingerprints(findings);

  if (includeExamples) {
    const backendRendered = renderContract(environmentContracts.backend);
    const rootKeys = parseExample(".env.example", backendRendered, findings);
    const backendKeys = parseExample("backend/.env.example", backendRendered, findings);
    const frontendRendered = renderContract(environmentContracts.frontend);
    const frontendKeys = parseExample("frontend/.env.example", frontendRendered, findings);

    if (rootKeys !== null) {
      compareKeySets(
        "backend contract",
        backendContractKeys,
        "root example",
        rootKeys,
        ".env.example",
        findings,
      );
    }
    if (backendKeys !== null) {
      compareKeySets(
        "backend contract",
        backendContractKeys,
        "backend example",
        backendKeys,
        "backend/.env.example",
        findings,
      );
    }
    if (frontendKeys !== null) {
      compareKeySets(
        "frontend contract",
        frontendContractKeys,
        "frontend example",
        frontendKeys,
        "frontend/.env.example",
        findings,
      );
    }

    const rootBytes = readBytes(".env.example", []);
    const backendBytes = readBytes("backend/.env.example", []);
    if (rootBytes !== null && backendBytes !== null && !rootBytes.equals(backendBytes)) {
      addFinding(
        findings,
        "backend-example-mismatch",
        ".env.example",
        "root and backend examples must be byte-identical",
      );
    }
  }

  return {
    backendKeyCount: backendSourceKeys.size,
    frontendKeyCount: frontendSourceKeys.size,
    findings: sortFindings(findings),
  };
}

export function checkEnvironmentExamples() {
  return runChecks({ includeExamples: true });
}

function printFailure(result) {
  console.error(`Environment example check failed with ${result.findings.length} findings.`);
  for (const finding of result.findings) {
    console.error(`  - ${finding.path} [${finding.code}] ${finding.message}`);
  }
}

function writeExamples() {
  const preflight = runChecks({ includeExamples: false });
  if (preflight.findings.length > 0) return preflight;
  for (const path of environmentContracts.backend.files) {
    writeFileSync(resolve(repositoryRoot, path), renderContract(environmentContracts.backend));
  }
  for (const path of environmentContracts.frontend.files) {
    writeFileSync(resolve(repositoryRoot, path), renderContract(environmentContracts.frontend));
  }
  return checkEnvironmentExamples();
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--print-fingerprints") {
    const findings = [];
    for (const target of currentFingerprints(findings)) {
      if (target.actual !== null) console.log(`${target.id} ${target.actual}`);
    }
    if (findings.length > 0) {
      printFailure({ findings: sortFindings(findings) });
      process.exitCode = 1;
    }
  } else if (args.length === 1 && args[0] === "--write") {
    const result = writeExamples();
    if (result.findings.length > 0) {
      printFailure(result);
      process.exitCode = 1;
    } else {
      console.log(
        `Environment examples generated and verified (${result.backendKeyCount} backend keys, ${result.frontendKeyCount} frontend key).`,
      );
    }
  } else if (args.length === 0) {
    const result = checkEnvironmentExamples();
    if (result.findings.length > 0) {
      printFailure(result);
      process.exitCode = 1;
    } else {
      console.log(
        `Environment example check passed (${result.backendKeyCount} backend keys, ${result.frontendKeyCount} frontend key).`,
      );
    }
  } else {
    console.error("Usage: node scripts/check-env-examples.mjs [--write|--print-fingerprints]");
    process.exitCode = 2;
  }
}
