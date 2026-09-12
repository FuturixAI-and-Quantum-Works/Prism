import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEnvironmentExamples } from "./check-env-examples.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const excludedDirectories = new Set([
  ".agents",
  ".claude",
  ".git",
  ".next",
  ".open-next",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

function collectTextFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return excludedDirectories.has(entry.name) ? [] : collectTextFiles(path);
      }
      return entry.isFile() && textExtensions.has(extname(entry.name).toLowerCase()) ? [path] : [];
    });
}

function collectDocxFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectDocxFiles(path);
    return entry.isFile() && extname(entry.name).toLowerCase() === ".docx" ? [path] : [];
  });
}

const checkerPath = fileURLToPath(import.meta.url);
const files = collectTextFiles(root).filter((path) => path !== checkerPath);
const contents = new Map(files.map((path) => [path, readFileSync(path, "utf8")]));
const environmentExampleCheck = checkEnvironmentExamples();
const trackedDocx = execFileSync("git", ["ls-files"], {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(
    (path) => path && extname(path).toLowerCase() === ".docx" && existsSync(resolve(root, path)),
  )
  .sort();
const retiredDocx = ["backend/Templates", "backend/sampleTemplates"]
  .flatMap((directory) => collectDocxFiles(resolve(root, directory)))
  .map((path) => relative(root, path))
  .sort();
const provenancePath = resolve(root, "docs/template-provenance.json");
const provenanceFindings = [];
const validProvenancePaths = new Set();
const provenancePaths = new Set();

try {
  const provenance = JSON.parse(readFileSync(provenancePath, "utf8"));
  if (provenance.schemaVersion !== 1) {
    provenanceFindings.push("docs/template-provenance.json must use schemaVersion 1");
  }
  if (!Array.isArray(provenance.docx)) {
    provenanceFindings.push("docs/template-provenance.json must contain a docx array");
  } else {
    for (const entry of provenance.docx) {
      const requiredFields = [
        "path",
        "source",
        "author",
        "license",
        "redistributionGrant",
        "attribution",
      ];
      const missingFields = requiredFields.filter(
        (field) => typeof entry?.[field] !== "string" || entry[field].trim() === "",
      );
      const entryPath = typeof entry?.path === "string" ? entry.path : "<missing path>";
      if (provenancePaths.has(entryPath)) {
        provenanceFindings.push(`Duplicate DOCX provenance entry: ${entryPath}`);
      }
      provenancePaths.add(entryPath);
      if (missingFields.length > 0) {
        provenanceFindings.push(`${entryPath} is missing: ${missingFields.join(", ")}`);
      } else {
        validProvenancePaths.add(entryPath);
      }
    }
  }
} catch (error) {
  provenanceFindings.push(
    `Cannot read docs/template-provenance.json: ${error instanceof Error ? error.message : String(error)}`,
  );
}

const unprovenDocx = trackedDocx.filter((path) => !validProvenancePaths.has(path));
const staleProvenance = [...provenancePaths].filter(
  (path) => path !== "<missing path>" && !trackedDocx.includes(path),
);

function matchingFiles(pattern, ignored = () => false) {
  return [...contents]
    .filter(([path, content]) => !ignored(path) && pattern.test(content))
    .map(([path]) => relative(root, path));
}

const blockers = [
  {
    id: "legacy-branding",
    message: "Legacy product or company branding remains",
    evidence: matchingFiles(/\b(?:legalbe|legalclonebe|legality|zerodesk)\b/i),
  },
  {
    id: "personal-address",
    message: "A personal email address remains",
    evidence: matchingFiles(/\bpasahanujjwal007@gmail\.com\b/i),
  },
  {
    id: "private-host",
    message: "A private or temporary service host remains",
    evidence: matchingFiles(
      /\b(?:[a-z0-9-]+\.ngrok-free\.dev|(?!(?:www|prism)\.)[a-z0-9-]+\.futurixai\.com)\b/i,
    ),
  },
  {
    id: "committed-token",
    message: "A committed JWT or provider token remains",
    evidence: matchingFiles(
      /\b(?:eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9_-]{16,})\b/,
      (path) => path.endsWith("package-lock.json"),
    ),
  },
  {
    id: "weak-secret-default",
    message: "A weak secret default remains",
    evidence: matchingFiles(/development-secret-change-me|change-me-in-production/i),
  },
  {
    id: "bun-lock",
    message: "Bun lockfiles remain",
    evidence: ["backend/bun.lock", "frontend/bun.lock"].filter((path) =>
      existsSync(resolve(root, path)),
    ),
  },
  {
    id: "stale-schema",
    message: "The stale hand-maintained schema remains",
    evidence: ["backend/schema.sql"].filter((path) => existsSync(resolve(root, path))),
  },
  {
    id: "duplicate-vite-config",
    message: "Duplicate frontend Vite configuration remains",
    evidence:
      ["frontend/vite.config.js", "frontend/src/client/vite.config.js"].filter((path) =>
        existsSync(resolve(root, path)),
      ).length > 1
        ? ["frontend/vite.config.js", "frontend/src/client/vite.config.js"]
        : [],
  },
  {
    id: "stale-playwright-config",
    message: "The stale Playwright configuration remains",
    evidence: ["playwright.config.mjs"].filter((path) => existsSync(resolve(root, path))),
  },
  {
    id: "environment-examples",
    message: "Environment examples are unsafe or out of sync",
    evidence: environmentExampleCheck.findings.map(
      ({ code, path, message }) => `${path} [${code}] ${message}`,
    ),
  },
  {
    id: "retired-docx-directories",
    message: "Retired bundled DOCX directories contain files",
    evidence: retiredDocx,
  },
  {
    id: "docx-provenance",
    message: "Tracked DOCX files lack complete provenance",
    evidence: [
      ...provenanceFindings,
      ...unprovenDocx,
      ...staleProvenance.map((path) => `Stale provenance entry: ${path}`),
    ],
  },
].filter(({ evidence }) => evidence.length > 0);

if (blockers.length === 0) {
  console.log("Publication check passed.");
  process.exit(0);
}

console.error(`Publication check failed with ${blockers.length} blocker groups.`);
for (const blocker of blockers) {
  console.error(`\n[${blocker.id}] ${blocker.message}:`);
  for (const path of blocker.evidence) {
    console.error(`  - ${path}`);
  }
}
process.exit(1);
