import { describe, expect, it } from "vitest";
import { calculateUptimePercentage } from "../../src/lib/healthCheck.js";

describe("calculateUptimePercentage", () => {
  it("returns null when no days were observed", () => {
    expect(calculateUptimePercentage(["no_data", "no_data"])).toBeNull();
  });

  it("weights degraded days and rounds observed values", () => {
    expect(calculateUptimePercentage(["operational", "operational", "degraded", "no_data"])).toBe(
      83.33,
    );
    expect(calculateUptimePercentage(["operational", "degraded", "down"])).toBe(50);
  });
});
