import { describe, expect, it } from "vitest";
import { createLifecycleRegistry } from "../../src/lifecycle.js";

describe("createLifecycleRegistry", () => {
  it("cleans up once in reverse registration order", async () => {
    const calls: string[] = [];
    const lifecycle = createLifecycleRegistry();
    lifecycle.register("database", () => {
      calls.push("database");
    });
    lifecycle.register("scheduler", () => {
      calls.push("scheduler");
    });
    lifecycle.register("http", () => {
      calls.push("http");
    });

    const first = lifecycle.shutdown();
    const second = lifecycle.shutdown();
    expect(second).toBe(first);
    await first;
    await lifecycle.shutdown();

    expect(calls).toEqual(["http", "scheduler", "database"]);
  });

  it("continues cleanup and reports every failure", async () => {
    const calls: string[] = [];
    const lifecycle = createLifecycleRegistry();
    lifecycle.register("database", () => {
      calls.push("database");
      throw new Error("database failure");
    });
    lifecycle.register("scheduler", () => {
      calls.push("scheduler");
      throw new Error("scheduler failure");
    });

    await expect(lifecycle.shutdown()).rejects.toMatchObject({
      errors: [
        expect.objectContaining({ message: "scheduler: scheduler failure" }),
        expect.objectContaining({ message: "database: database failure" }),
      ],
    });
    expect(calls).toEqual(["scheduler", "database"]);
  });

  it("rejects registration after shutdown starts", async () => {
    const lifecycle = createLifecycleRegistry();
    lifecycle.register("resource", () => undefined);
    const shutdown = lifecycle.shutdown();

    expect(() => lifecycle.register("late", () => undefined)).toThrow(/after shutdown/);
    await shutdown;
  });
});
