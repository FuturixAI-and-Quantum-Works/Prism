import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));

const targets = [
  {
    path: "../../src/modules/ai/tools/documentContent.ts",
    allowedEvents: new Set([
      "[read_document] started",
      "[read_document] not_found",
      "[read_document] download_failed",
      "[read_document] extraction_fallback",
      "[read_document] completed",
      "[read_document] failed",
    ]),
  },
  {
    path: "../../src/modules/ai/tools/documentGenerationExecutors.ts",
    allowedEvents: new Set(["[generate_docx] started"]),
  },
  {
    path: "../../src/lib/email.ts",
    allowedEvents: new Set(["[email] delivery_suppressed", "[email] send_failed"]),
  },
  {
    path: "../../src/modules/documents/documents.core.controller.ts",
    allowedEvents: new Set(["[documents] create_failed"]),
  },
] as const;

const deniedLogContent = [
  /\$\{/,
  /@/,
  /\b(?:args|docIndex|docLabel|documentId|err|error|filename|folderPaths)\b/i,
  /\b(?:fromEmail|input|output|provider|raw|reason|response|senderDomain)\b/i,
  /\b(?:sourcePath|storage_path|subject|text|title)\b/i,
  /[\u0900-\u097f]/,
];

function collectConsoleCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "console"
    ) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return calls;
}

test("production logs use approved static events without sensitive payloads", async () => {
  for (const target of targets) {
    const absolutePath = resolve(testDirectory, target.path);
    const source = await readFile(absolutePath, "utf8");
    const sourceFile = ts.createSourceFile(
      absolutePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const calls = collectConsoleCalls(sourceFile);

    assert.ok(calls.length > 0, `${target.path} must contain audited operational logs`);

    for (const call of calls) {
      const callText = call.getText(sourceFile);
      assert.equal(call.arguments.length, 1, `${target.path}: ${callText}`);

      const event = call.arguments[0];
      assert.ok(
        event && ts.isStringLiteralLike(event),
        `${target.path} must use a static log event: ${callText}`,
      );
      assert.ok(
        target.allowedEvents.has(event.text),
        `${target.path} contains an unapproved log event: ${event.text}`,
      );

      const loggedContent = call.arguments
        .map((argument) => argument.getText(sourceFile))
        .join(" ");
      for (const denied of deniedLogContent) {
        assert.doesNotMatch(loggedContent, denied, `${target.path}: ${callText}`);
      }
    }
  }
});
