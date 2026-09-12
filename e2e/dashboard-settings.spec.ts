import type { Locator, Page } from "@playwright/test";
import {
  captureScreenshot,
  expect,
  expectNoModerateOrWorseAxeViolations,
  test,
} from "./fixtures/test";
import { expandedSidebarAxeExceptions } from "./fixtures/axeExceptions";
import { ids } from "./fixtures/data";

async function tabTo(page: Page, target: Locator, limit = 50) {
  await expect(target).toBeVisible();
  for (let index = 0; index <= limit; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    if (index < limit) await page.keyboard.press("Tab");
  }
  throw new Error(`Target was not reached after ${limit} Tab presses`);
}

test("dashboard and project navigation work with the keyboard", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Search dashboard")).toBeVisible();
  await expect(page.getByText("Acme Legal Workspace", { exact: true }).first()).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page);
  await captureScreenshot(page, "dashboard");

  await page.keyboard.press("Control+b");
  await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeVisible();
  const projectsMenu = page.getByRole("button", { name: "Projects", exact: true });
  await tabTo(page, projectsMenu);
  await expect(projectsMenu).toBeFocused();
  await page.keyboard.press("Enter");
  const myProjects = page.getByRole("button", { name: "My Projects" });
  await expect(myProjects).toBeVisible();
  await tabTo(page, myProjects);
  await expect(myProjects).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL("/workspaces");
  await expect(page.getByRole("button", { name: "Open Acme Legal Workspace" })).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page, expandedSidebarAxeExceptions);

  const workspace = page.getByRole("button", { name: "Open Acme Legal Workspace" });
  await tabTo(page, workspace);
  await expect(workspace).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(`/workspaces/${ids.workspace}`);
  await expect(page.getByText("Acme Legal Workspace", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("Master Services Agreement.docx", { exact: true }).first(),
  ).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page, expandedSidebarAxeExceptions);
});

test("settings supports a provider connection and model preference", async ({ page, mockApi }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "AI settings" })).toBeVisible();
  await expect(page.getByText("GPT 5.2", { exact: true })).toBeVisible();

  const addConnection = page.getByRole("button", { name: "Add connection" });
  await tabTo(page, addConnection);
  await expect(addConnection).toBeFocused();
  await page.keyboard.press("Enter");
  const provider = page.getByLabel("Provider", { exact: true });
  await tabTo(page, provider);
  await expect(provider).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(provider).toHaveValue("openai-compatible");
  await page.getByLabel("Display name", { exact: true }).fill("Local Gateway");
  await page.getByLabel("API key").fill("browser-test-key");
  await page.getByLabel("Endpoint URL").fill("https://models.example.test/v1");
  await page.getByLabel("Model ID").fill("contract-model-v1");
  await page.getByLabel("Model display name").fill("Contract Model");
  await page.getByRole("button", { name: "Save connection" }).click();

  await expect(page.getByText("Connection saved.")).toBeVisible();
  const connection = page
    .getByRole("article")
    .filter({ hasText: "Local Gateway" })
    .filter({ has: page.getByRole("button", { name: "Test" }) });
  await expect(connection).toBeVisible();
  await connection.getByRole("button", { name: "Test" }).click();
  await expect(page.getByText("Local Gateway connected successfully.")).toBeVisible();

  await page.getByLabel("Chat model").selectOption({ label: "Local Gateway · Contract Model" });
  await expect(page.getByText("Model preference saved.")).toBeVisible();
  expect(mockApi.wasCalled("PUT", "/user/ai/preferences/main")).toBe(true);
  await expectNoModerateOrWorseAxeViolations(page);
});
