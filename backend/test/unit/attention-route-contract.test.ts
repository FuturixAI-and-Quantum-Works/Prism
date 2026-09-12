import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

it("mounts the attention router once at its canonical path", async () => {
  const source = await readFile(
    new URL("../../src/productionDependencies.ts", import.meta.url),
    "utf8",
  );
  const mountPaths = [...source.matchAll(/\{ path: "([^"]+)", router: attentionRouter \}/g)].map(
    ([, path]) => path,
  );

  expect(mountPaths).toEqual(["/attention-items"]);
});
