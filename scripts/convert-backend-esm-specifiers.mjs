import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = resolve(root, "backend");
const checkOnly = process.argv.includes("--check");
const sourceExtensions = [".ts", ".tsx", ".mts", ".cts"];
const emittedExtension = new Map([
  [".ts", ".js"],
  [".tsx", ".js"],
  [".mts", ".mjs"],
  [".cts", ".cjs"],
]);
const sourceForEmittedExtension = new Map([
  [".js", [".ts", ".tsx"]],
  [".mjs", [".mts"]],
  [".cjs", [".cts"]],
]);

function collectTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return collectTypeScriptFiles(path);
      }
      return entry.isFile() && sourceExtensions.some((extension) => entry.name.endsWith(extension))
        ? [path]
        : [];
    });
}

function sourceFileFor(path, text) {
  const scriptKind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKind);
}

function isRelativeModuleSpecifier(node) {
  if (!ts.isStringLiteral(node) || !node.text.startsWith(".")) {
    return false;
  }
  const parent = node.parent;
  if (
    (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) &&
    parent.moduleSpecifier === node
  ) {
    return true;
  }
  if (
    ts.isCallExpression(parent) &&
    parent.expression.kind === ts.SyntaxKind.ImportKeyword &&
    parent.arguments[0] === node
  ) {
    return true;
  }
  return (
    ts.isLiteralTypeNode(parent) &&
    ts.isImportTypeNode(parent.parent) &&
    parent.parent.argument === parent
  );
}

function resolvedSpecifier(importer, specifier) {
  const base = resolve(dirname(importer), specifier);
  const inputExtension = sourceExtensions.find((extension) => specifier.endsWith(extension));
  if (inputExtension && existsSync(base)) {
    return `${specifier.slice(0, -inputExtension.length)}${emittedExtension.get(inputExtension)}`;
  }

  const runtimeExtension = extname(specifier);
  const mappedSources = sourceForEmittedExtension.get(runtimeExtension) ?? [];
  for (const sourceExtension of mappedSources) {
    const candidate = `${base.slice(0, -runtimeExtension.length)}${sourceExtension}`;
    if (existsSync(candidate)) {
      return specifier;
    }
  }

  for (const sourceExtension of sourceExtensions) {
    if (existsSync(`${base}${sourceExtension}`)) {
      return `${specifier}${emittedExtension.get(sourceExtension)}`;
    }
  }

  if (existsSync(base) && statSync(base).isDirectory()) {
    for (const sourceExtension of sourceExtensions) {
      if (existsSync(resolve(base, `index${sourceExtension}`))) {
        return `${specifier.replace(/\/$/, "")}/index${emittedExtension.get(sourceExtension)}`;
      }
    }
  }

  if (existsSync(base) && statSync(base).isFile()) {
    return specifier;
  }

  throw new Error(`Cannot resolve ${JSON.stringify(specifier)} from ${importer}`);
}

const files = [
  ...collectTypeScriptFiles(resolve(backend, "src")),
  ...collectTypeScriptFiles(resolve(backend, "test")),
];
let changedFiles = 0;
let changedSpecifiers = 0;
let checkedSpecifiers = 0;

for (const path of files) {
  const text = readFileSync(path, "utf8");
  const sourceFile = sourceFileFor(path, text);
  const edits = [];

  function visit(node) {
    if (isRelativeModuleSpecifier(node)) {
      checkedSpecifiers += 1;
      const replacement = resolvedSpecifier(path, node.text);
      if (replacement !== node.text) {
        const start = node.getStart(sourceFile);
        const quote = text[start];
        edits.push({
          start,
          end: node.end,
          text: `${quote}${replacement}${quote}`,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (edits.length === 0) {
    continue;
  }

  changedFiles += 1;
  changedSpecifiers += edits.length;
  if (!checkOnly) {
    const updated = edits
      .sort((left, right) => right.start - left.start)
      .reduce(
        (content, edit) => `${content.slice(0, edit.start)}${edit.text}${content.slice(edit.end)}`,
        text,
      );
    writeFileSync(path, updated);
  }
}

if (checkOnly && changedSpecifiers > 0) {
  console.error(
    `${changedSpecifiers} relative ESM specifiers in ${changedFiles} files need normalization.`,
  );
  process.exit(1);
}

console.log(
  checkOnly
    ? `All ${checkedSpecifiers} relative ESM specifiers resolve across ${files.length} TypeScript files.`
    : `Normalized ${changedSpecifiers} relative ESM specifiers in ${changedFiles} files.`,
);
