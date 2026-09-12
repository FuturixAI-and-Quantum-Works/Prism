import { expect, expectNoModerateOrWorseAxeViolations, test } from "./fixtures/test";
import { ids } from "./fixtures/data";

test("email OTP, onboarding, dashboard, and logout", async ({ page, mockApi }) => {
  mockApi.setSignedOut();
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign in to Prism" })).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page);

  const email = page.getByLabel("Email address");
  await page.keyboard.press("Tab");
  await expect(email).toBeFocused();
  await page.keyboard.type("alex@example.test");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Verify your access" })).toBeVisible();
  await expect
    .poll(() => mockApi.wasCalled("POST", "/auth/email-otp/send-verification-otp"))
    .toBe(true);

  await expect(page.getByLabel("OTP digit 1")).toBeFocused();
  await page.keyboard.type("123456");

  await expect(page.getByRole("heading", { name: "Complete your profile" })).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page);

  await page.getByLabel("Full name").fill("Alex Morgan");
  await page.getByRole("button", { name: "Lawyer" }).click();
  await page.getByLabel("Country or jurisdiction").selectOption("United States");
  await page.getByLabel("Organization").fill("Prism Legal");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("Search dashboard")).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page);

  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Email address")).toBeVisible();
});

test("public approval can be reviewed and approved", async ({ page, mockApi }) => {
  mockApi.setSignedOut();
  await page.goto("/approval/approval-token");

  await expect(page.getByRole("heading", { name: "Approval requested" })).toBeVisible();
  await expect(page.getByText("Liability cap update")).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page);

  await page.getByLabel("Decision note").fill("Approved for execution.");
  await page.getByRole("button", { name: "Approve" }).click();

  await expect(page.getByText("Status: approved")).toBeVisible();
  expect(mockApi.wasCalled("POST", "/approvals/public/approval-token/decision")).toBe(true);
});

test("authenticated user can accept a project invitation", async ({ page, mockApi }) => {
  await page.goto("/share/accept/share-token");

  await expect(
    page.getByRole("heading", { name: "Accept access to Acme Legal Project" }),
  ).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page);
  await page.getByRole("button", { name: "Accept invite" }).click();

  await expect(page).toHaveURL(`/projects/${ids.project}`);
  await expect(page.getByRole("heading", { name: "Acme Legal Project" })).toBeVisible();
  await expect(page.getByText("Matter ACME-001")).toBeVisible();
  await expect(page.getByText("Editor")).toBeVisible();
  expect(mockApi.wasCalled("POST", "/invitations/share-token/accept")).toBe(true);
  expect(mockApi.wasCalled("GET", `/projects/${ids.project}`)).toBe(true);
  expect(mockApi.matchingCalls("POST", "/invitations/share-token/accept")).toEqual([
    expect.objectContaining({ origin: "http://localhost:3001" }),
  ]);
});

test("status requires authentication while unknown routes remain public", async ({
  page,
  mockApi,
}) => {
  await page.goto("/status");

  await expect(page.getByText("All Systems Operational")).toBeVisible();
  await expect(page.getByText("Prism API")).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page);

  mockApi.setSignedOut();
  await page.goto("/status");
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("heading", { name: "Sign in to Prism" })).toBeVisible();

  await page.goto("/route-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toBeVisible();
  await expectNoModerateOrWorseAxeViolations(page);
});
