import {
  captureScreenshot,
  expect,
  expectNoModerateOrWorseAxeViolations,
  test,
} from "./fixtures/test";
import { ids } from "./fixtures/data";

test.use({ video: "on" });

test("tabular review reconnects from its cursor and cancels a resumed generation", async ({
  page,
  mockApi,
}) => {
  const stored = mockApi.prepareTabularReconnect();
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    stored,
  );

  await page.goto(`/review/${ids.review}`);

  await expect(page.getByText("Contract risk review", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
  await expect
    .poll(() =>
      mockApi
        .matchingCalls("GET", `/tabular-review/${ids.review}/generate`)
        .some(
          ({ query }) =>
            query.after === String(stored.value.after) && query.run_id === stored.value.runId,
        ),
    )
    .toBe(true);
  expect(mockApi.matchingCalls("POST", `/tabular-review/${ids.review}/generate`)).toHaveLength(0);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), stored.key))
    .toContain(stored.value.runId);
  await expectNoModerateOrWorseAxeViolations(page);
  await captureScreenshot(page, "review");

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Run", exact: true })).toBeVisible();
  await expect
    .poll(() =>
      mockApi
        .matchingCalls("DELETE", `/tabular-review/${ids.review}/generate`)
        .some(({ query }) => query.run_id === stored.value.runId),
    )
    .toBe(true);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), stored.key)).toBeNull();
  expect(mockApi.matchingCalls("POST", `/tabular-review/${ids.review}/generate`)).toHaveLength(0);
});
