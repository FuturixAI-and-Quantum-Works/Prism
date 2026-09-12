import { expect, expectNoModerateOrWorseAxeViolations, test } from "./fixtures/test";
import {
  assistantAxeExceptions,
  documentListAxeExceptions,
  rulebookAxeExceptions,
  sourcesAxeExceptions,
  templatePreviewAxeExceptions,
} from "./fixtures/axeExceptions";
import { ids } from "./fixtures/data";

test("library filters its document catalog", async ({ page }) => {
  await page.goto("/library");

  await expect(page.getByRole("link", { name: "Library" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview Master Services Agreement.docx" }),
  ).toBeVisible();
  const search = page.getByLabel("Search documents");
  await search.fill("privacy");
  await expect(
    page.getByRole("button", { name: "Preview Master Services Agreement.docx" }),
  ).toBeHidden();
  await search.clear();
  await expect(
    page.getByRole("button", { name: "Preview Master Services Agreement.docx" }),
  ).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page, documentListAxeExceptions);
});

test("templates can be searched and previewed", async ({ page }) => {
  await page.goto("/templates");

  await expect(page.getByRole("button", { name: "Open Mutual NDA" })).toBeVisible();
  const search = page.getByLabel("Search templates");
  await search.fill("consulting");
  await expect(page.getByRole("button", { name: "Open Consulting Agreement" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Mutual NDA" })).toBeHidden();
  await search.clear();
  await page.getByRole("button", { name: "Open Mutual NDA" }).click();
  await expect(page.getByRole("dialog", { name: "Mutual NDA" })).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page);
});

test("template preview substitutes field values in the document", async ({ page }) => {
  await page.goto(`/template-preview/${ids.template}`);

  await expect(page.getByText("Input Fields", { exact: true })).toBeVisible();
  await page.getByLabel("Company name").fill("Acme Ventures");
  await expect(page.locator('[contenteditable="true"]')).toContainText("Acme Ventures");
  await expect(page.getByRole("button", { name: "Create Document" })).toBeEnabled();
  await expectNoModerateOrWorseAxeViolations(page, templatePreviewAxeExceptions);
});

test("assistant sends a prompt and renders the streamed response", async ({ page, mockApi }) => {
  await page.goto("/assistant");

  await expect(page.getByRole("heading", { name: "How may I assist you?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Search mode:/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Add to message" }).click();
  await expect(page.getByRole("menuitem", { name: "Add Files" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Add from Project" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Add Source" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  const composer = page.getByLabel("Message Prism");
  await composer.fill("  Find the termination clause.  ");
  await composer.press("Enter");
  await expect(page.getByText("Find the termination clause.")).toBeVisible();
  await expect(page.getByText("I found one termination clause.")).toBeVisible();
  expect(
    mockApi.matchingCalls("POST", "/chat").map(({ body }) => JSON.parse(body ?? "{}")),
  ).toEqual([
    {
      messages: [{ role: "user", content: "Find the termination clause." }],
    },
  ]);
  await expectNoModerateOrWorseAxeViolations(page, assistantAxeExceptions);
});

test("document lists support search and status tabs", async ({ page }) => {
  await page.goto("/documents");

  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview Master Services Agreement.docx" }),
  ).toBeVisible();
  await page.getByLabel("Search documents").fill("missing document");
  await expect(
    page.getByRole("button", { name: "Preview Master Services Agreement.docx" }),
  ).toBeHidden();
  await page.getByLabel("Search documents").clear();
  const doneTab = page.getByRole("tab", { name: "Done" });
  const activeTab = page.getByRole("tab", { name: "Active" });
  await doneTab.click();
  await expect(doneTab).toHaveAttribute("aria-selected", "true");
  await activeTab.click();
  await expect(activeTab).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Preview Master Services Agreement.docx" }),
  ).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page, documentListAxeExceptions);
});

test("rulebook list searches and opens an existing rulebook", async ({ page }) => {
  await page.goto("/rulebook");

  await expect(page.getByRole("heading", { name: "Rulebooks" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Commercial Contract Rulebook" })).toBeVisible();
  await page.getByLabel("Search rulebooks").fill("privacy");
  await expect(page.getByRole("button", { name: "Commercial Contract Rulebook" })).toBeHidden();
  await page.getByLabel("Search rulebooks").clear();
  await page.getByRole("button", { name: "Commercial Contract Rulebook" }).click();
  await expect(page.getByRole("dialog", { name: "Commercial Contract Rulebook" })).toBeVisible();
  await expect(page.getByLabel("Rulebook title")).toHaveValue("Commercial Contract Rulebook");
  await expectNoModerateOrWorseAxeViolations(page, rulebookAxeExceptions);
});

test("sources report health and retry a failed source", async ({ page, mockApi }) => {
  await page.goto("/sources");

  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  await expect(page.getByText("Master Services Agreement.docx")).toBeVisible();
  await expect(page.getByText("Vendor Security Addendum.pdf")).toBeVisible();
  await expect(page.getByText("Degraded", { exact: true })).toBeVisible();
  await page
    .locator("button:enabled")
    .filter({ hasText: /^Retry$/ })
    .click();
  await expect
    .poll(() => mockApi.wasCalled("POST", `/sources/${ids.sourceFailed}/retry`))
    .toBe(true);
  await expect(page.getByText("Pending", { exact: true })).toHaveCount(2);
  await expectNoModerateOrWorseAxeViolations(page, sourcesAxeExceptions);
});
