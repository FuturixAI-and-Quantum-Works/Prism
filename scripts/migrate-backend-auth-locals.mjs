import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(repositoryRoot, "backend/src");
const authMiddlewarePath = resolve(sourceRoot, "middleware/auth.ts");
const checkOnly = process.argv.includes("--check");
const replacementsByName = {
  userId: "res.locals.auth.user.id",
  userEmail: "res.locals.auth.user.email.toLowerCase()",
  userRole: '(res.locals.auth.profile?.role ?? "viewer")',
};

async function listTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) return listTypeScriptFiles(path);
        return extname(entry.name) === ".ts" ? [path] : [];
      }),
  );
  return paths.flat();
}

function legacyLocalName(node) {
  if (!ts.isPropertyAccessExpression(node)) return null;
  if (!(node.name.text in replacementsByName)) return null;
  if (!ts.isPropertyAccessExpression(node.expression)) return null;
  if (node.expression.name.text !== "locals") return null;
  if (!ts.isIdentifier(node.expression.expression)) return null;
  return node.expression.expression.text === "res" ? node.name.text : null;
}

function collectReplacements(sourceFile) {
  const replacements = [];

  function visit(node) {
    const name = legacyLocalName(node);
    if (name) {
      const target =
        ts.isAsExpression(node.parent) && node.parent.expression === node ? node.parent : node;
      replacements.push({
        start: target.getStart(sourceFile),
        end: target.getEnd(),
        text: replacementsByName[name],
      });
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return replacements;
}

const changedFiles = [];
let replacementCount = 0;

for (const path of await listTypeScriptFiles(sourceRoot)) {
  const source = await readFile(path, "utf8");
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const replacements = collectReplacements(sourceFile);
  if (replacements.length === 0) continue;
  if (!checkOnly && path === authMiddlewarePath) continue;

  changedFiles.push(path);
  replacementCount += replacements.length;
  if (checkOnly) continue;

  const migrated = replacements
    .sort((left, right) => right.start - left.start)
    .reduce(
      (contents, replacement) =>
        contents.slice(0, replacement.start) + replacement.text + contents.slice(replacement.end),
      source,
    );
  await writeFile(path, migrated);
}

if (checkOnly && replacementCount > 0) {
  for (const path of changedFiles) {
    process.stderr.write(`${path.slice(repositoryRoot.length + 1)}\n`);
  }
  process.stderr.write(
    `Found ${replacementCount} legacy auth-local references across ${changedFiles.length} files.\n`,
  );
  process.exitCode = 1;
} else if (checkOnly) {
  process.stdout.write("No legacy auth-local references found in backend source.\n");
} else {
  process.stdout.write(
    `Migrated ${replacementCount} legacy auth-local references across ${changedFiles.length} files.\n`,
  );
}
