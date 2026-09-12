import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";
import { fixedNow } from "./data";
import { MockBackend } from "./mockBackend";

interface Fixtures {
  browserDiagnostics: {
    expectConsoleError: (pattern: RegExp) => void;
  };
  mockApi: MockBackend;
}

export const test = base.extend<Fixtures>({
  browserDiagnostics: [
    async ({ page }, use) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const expectedConsoleErrors: RegExp[] = [];
      page.on("pageerror", (error) => {
        pageErrors.push(error.stack || error.message);
      });
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const location = message.location();
        const source = location.url ? ` (${location.url}:${location.lineNumber})` : "";
        consoleErrors.push(`${message.text()}${source}`);
      });

      await use({
        expectConsoleError: (pattern) => expectedConsoleErrors.push(pattern),
      });

      const matches = (pattern: RegExp, message: string) => {
        pattern.lastIndex = 0;
        return pattern.test(message);
      };
      const unexpectedConsoleErrors = consoleErrors.filter(
        (message) => !expectedConsoleErrors.some((pattern) => matches(pattern, message)),
      );
      const missingConsoleErrors = expectedConsoleErrors.filter(
        (pattern) => !consoleErrors.some((message) => matches(pattern, message)),
      );

      expect(pageErrors, `Unexpected page errors:\n${pageErrors.join("\n")}`).toEqual([]);
      expect(
        unexpectedConsoleErrors,
        `Unexpected console.error calls:\n${unexpectedConsoleErrors.join("\n")}`,
      ).toEqual([]);
      expect(
        missingConsoleErrors.map(String),
        "Expected console.error calls were not observed",
      ).toEqual([]);
    },
    { auto: true },
  ],
  mockApi: [
    async ({ context, page }, use) => {
      const mockApi = new MockBackend();
      await mockApi.install(context);
      await page.clock.setFixedTime(new Date(fixedNow));
      await use(mockApi);
      expect(mockApi.unhandled, `Unhandled API requests:\n${mockApi.unhandled.join("\n")}`).toEqual(
        [],
      );
      expect(
        mockApi.networkFailures,
        `Failed browser requests:\n${mockApi.networkFailures.join("\n")}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export interface AxeException {
  ruleId: string;
  html: RegExp;
  reason: string;
}

export async function expectNoModerateOrWorseAxeViolations(
  page: Page,
  exceptions: readonly AxeException[] = [],
) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const matchedExceptions = new Set<number>();
  const violations = results.violations
    .filter(({ impact }) => impact === "moderate" || impact === "serious" || impact === "critical")
    .map(({ id, impact, help, nodes }) => {
      const unexpectedNodes = nodes.filter((node) => {
        const exceptionIndex = exceptions.findIndex((exception) => {
          exception.html.lastIndex = 0;
          return (
            exception.ruleId === id && exception.reason.trim() && exception.html.test(node.html)
          );
        });
        if (exceptionIndex < 0) return true;
        matchedExceptions.add(exceptionIndex);
        return false;
      });
      return {
        id,
        impact,
        help,
        nodes: unexpectedNodes.map((node) => ({
          target: node.target.join(" "),
          html: node.html,
          failureSummary: node.failureSummary,
        })),
      };
    })
    .filter(({ nodes }) => nodes.length > 0);
  const staleExceptions = exceptions
    .filter((_, index) => !matchedExceptions.has(index))
    .map(({ ruleId, html, reason }) => ({ ruleId, html: String(html), reason }));

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  expect(
    staleExceptions,
    `Scoped axe exceptions no longer match:\n${JSON.stringify(staleExceptions, null, 2)}`,
  ).toEqual([]);
}

export async function captureScreenshot(page: Page, name: string) {
  const directory = path.resolve("test-results/screenshots");
  await mkdir(directory, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const screenshot = await page.screenshot({
    path: path.join(directory, `${name}.png`),
    animations: "disabled",
    fullPage: true,
  });
  const metrics = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const image = new Image();
    image.src = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not inspect screenshot pixels");
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(image.src);

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const sampleStep = Math.max(1, Math.floor(pixels.length / 4 / 4096));
    const sampledColors = new Set<string>();
    for (let pixel = 0; pixel < pixels.length / 4; pixel += sampleStep) {
      const offset = pixel * 4;
      sampledColors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
      if (sampledColors.size > 16) break;
    }

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      sampledColors: sampledColors.size,
    };
  }, screenshot.toString("base64"));
  const viewport = page.viewportSize();

  expect(screenshot.byteLength, `${name} screenshot is unexpectedly small`).toBeGreaterThan(1024);
  expect(metrics.width).toBe(viewport?.width);
  expect(metrics.height).toBeGreaterThanOrEqual(viewport?.height ?? 1);
  expect(metrics.sampledColors, `${name} screenshot appears blank`).toBeGreaterThan(8);
}
