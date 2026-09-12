import { expect, expectNoModerateOrWorseAxeViolations, test } from "./fixtures/test";
import { ids } from "./fixtures/data";

test("compliance reconnects from its cursor and can cancel the next run", async ({
  browserDiagnostics,
  page,
  mockApi,
}) => {
  const stored = mockApi.prepareComplianceReconnect();
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    stored,
  );

  await page.goto(`/compliance/documents/${ids.document}`);

  await expect(page.getByText("Compliance Review", { exact: true })).toBeVisible();
  await expect(page.getByText("91%", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Risk Threats" }).click();
  await expect(page.getByText("The uncapped indemnity requires remediation.")).toBeVisible();
  await expect
    .poll(() =>
      mockApi
        .matchingCalls("GET", `/compliance-review/${ids.compliance}/run`)
        .some(({ query }) => query.after === "7" && query.run_id === "compliance-run-reconnect"),
    )
    .toBe(true);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), stored.key)).toBeNull();
  await expectNoModerateOrWorseAxeViolations(page);

  mockApi.interruptNextComplianceRun();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
  await expect
    .poll(() =>
      mockApi
        .matchingCalls("GET", `/compliance-review/${ids.compliance}/run`)
        .some(({ query }) => query.run_id === "compliance-run-cancel" && query.after === "1"),
    )
    .toBe(true);

  browserDiagnostics.expectConsoleError(/status of 404 .*run_id=wrong-run/);
  const wrongRunStatus = await page.evaluate(async (reviewId) => {
    const response = await fetch(
      `http://localhost:3001/compliance-review/${reviewId}/run?run_id=wrong-run`,
      { method: "DELETE", credentials: "include" },
    );
    return response.status;
  }, ids.compliance);
  expect(wrongRunStatus).toBe(404);

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Run", exact: true })).toBeVisible();
  expect(
    mockApi
      .matchingCalls("DELETE", `/compliance-review/${ids.compliance}/run`)
      .some(({ query }) => query.run_id === "compliance-run-cancel"),
  ).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        (key) => localStorage.getItem(key),
        `prism_durable_run:compliance:${ids.compliance}`,
      ),
    )
    .toBeNull();
});
