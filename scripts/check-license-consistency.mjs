import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootManifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const expectedLicense = rootManifest.license;

assert.equal(
  expectedLicense,
  "AGPL-3.0-only",
  "Root package license must use the AGPL-3.0-only SPDX ID",
);

const workspaceDirectories = rootManifest.workspaces.flatMap((workspace) => {
  if (!workspace.endsWith("/*")) return [workspace];
  const parent = path.join(root, workspace.slice(0, -2));
  return readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(workspace.slice(0, -2), entry.name));
});
const packagePaths = ["", ...workspaceDirectories].map((directory) =>
  path.join(directory, "package.json"),
);
const lockfile = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));

for (const packagePath of packagePaths) {
  const absolutePath = path.join(root, packagePath);
  assert(existsSync(absolutePath), `Workspace manifest is missing: ${packagePath}`);
  const manifest = JSON.parse(readFileSync(absolutePath, "utf8"));
  assert.equal(
    manifest.license,
    expectedLicense,
    `${packagePath} license must match the root package`,
  );

  const lockKey = path.dirname(packagePath) === "." ? "" : path.dirname(packagePath);
  assert.equal(
    lockfile.packages?.[lockKey]?.license,
    expectedLicense,
    `package-lock.json license for ${lockKey || "the root package"} must match`,
  );
}

const licenseText = readFileSync(path.join(root, "LICENSE"), "utf8");
assert.match(licenseText, /GNU AFFERO GENERAL PUBLIC LICENSE/);
assert.match(licenseText, /Version 3, 19 November 2007/);

console.log(
  `License check passed for LICENSE and ${packagePaths.length} first-party package manifests.`,
);
