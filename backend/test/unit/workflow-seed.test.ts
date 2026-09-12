import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SYSTEM_WORKFLOWS } from "../../src/scripts/seedWorkflows.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

describe("system workflow seed", () => {
  it("preserves the three stable workflow keys and behaviors", () => {
    expect(SYSTEM_WORKFLOWS.map(({ stableKey }) => stableKey)).toEqual([
      "builtin-cp-checklist",
      "builtin-credit-summary",
      "builtin-sha-summary",
    ]);
    expect(SYSTEM_WORKFLOWS.map(({ title }) => title)).toEqual([
      "Generate CP Checklist",
      "Credit Agreement Summary",
      "Shareholder Agreement Summary",
    ]);

    for (const workflow of SYSTEM_WORKFLOWS) {
      expect(Object.keys(workflow).sort()).toEqual(
        ["isSystem", "promptMd", "stableKey", "title", "type", "userId"].sort(),
      );
      expect(workflow).toMatchObject({
        type: "assistant",
        userId: null,
        isSystem: true,
      });
      expect(workflow.promptMd.length).toBeGreaterThan(200);
    }

    expect(SYSTEM_WORKFLOWS[0].promptMd).toContain("landscape: true");
    expect(SYSTEM_WORKFLOWS[0].promptMd).toContain("Index, Clause Number, Clause, Status");
    expect(SYSTEM_WORKFLOWS[1].promptMd).toContain("do NOT call generate_docx");
    expect(SYSTEM_WORKFLOWS[2].promptMd).toContain(
      "Generate the summary as a downloadable Word document.",
    );
  });

  it("uses one transaction and upserts by stable key", async () => {
    const seedSource = await readFile(
      path.join(repositoryRoot, "backend/src/scripts/seedWorkflows.ts"),
      "utf8",
    );

    expect(seedSource).toContain("db.transaction");
    expect(seedSource).toContain("onConflictDoUpdate");
    expect(seedSource).toContain("target: workflows.stableKey");
  });

  it("keeps built-in content out of runtime source files", async () => {
    const runtimeFiles = [
      "backend/src/modules/ai/tools/runtimeCoordinator.ts",
      "backend/src/modules/workflows/workflows.composition.ts",
    ];

    for (const relativePath of runtimeFiles) {
      const source = await readFile(path.join(repositoryRoot, relativePath), "utf8");
      expect(source).not.toContain("builtinWorkflows");
      expect(source).not.toContain("builtin-cp-checklist");
      expect(source).not.toContain("builtin-credit-summary");
      expect(source).not.toContain("builtin-sha-summary");
      expect(source).not.toContain("SYSTEM_WORKFLOWS");
    }

    await expect(
      readFile(path.join(repositoryRoot, "backend/src/lib/builtinWorkflows.ts"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
