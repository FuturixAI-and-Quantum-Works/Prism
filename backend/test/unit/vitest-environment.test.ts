import { describe, expect, it } from "vitest";

describe("backend test environment", () => {
  it("uses the configured Node environment", () => {
    expect(globalThis.document).toBeUndefined();
    expect(process.release.name).toBe("node");
  });
});
