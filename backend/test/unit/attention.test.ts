import { describe, expect, it } from "vitest";
import { isAttentionItemStatus } from "../../src/lib/attention.js";

describe("attention item status", () => {
  it("accepts only persisted status values", () => {
    expect(isAttentionItemStatus("pending")).toBe(true);
    expect(isAttentionItemStatus("viewed")).toBe(true);
    expect(isAttentionItemStatus("resolved")).toBe(true);
    expect(isAttentionItemStatus("dismissed")).toBe(true);
    expect(isAttentionItemStatus("unknown")).toBe(false);
    expect(isAttentionItemStatus(["pending"])).toBe(false);
  });
});
