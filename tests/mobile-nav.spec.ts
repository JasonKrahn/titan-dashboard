import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const artifactDir = path.join("artifacts", "mobile-nav");

const pages = [
  {
    name: "project",
    path: "/project/proj-active-insulation",
    heading: "Fortress Cedar Point Villas",
  },
  {
    name: "phase",
    path: "/project/proj-active-insulation/phase/proj-active-insulation-phase-drywall",
    heading: "Drywall",
  },
] as const;

const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
] as const;

test.beforeAll(async () => {
  await mkdir(artifactDir, { recursive: true });
});

for (const viewport of viewports) {
  for (const target of pages) {
    test(`${target.name} mobile breadcrumb at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(target.path);
      await expect(page.getByRole("heading", { name: target.heading })).toBeVisible();

      await expectNoHorizontalDocumentOverflow(page);
      await expectReadableMobileBreadcrumb(page);

      await page.screenshot({
        path: path.join(artifactDir, `${target.name}-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    });
  }
}

async function expectNoHorizontalDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectReadableMobileBreadcrumb(page: Page) {
  const breadcrumb = page.getByTestId("page-nav-mobile-breadcrumb");
  await expect(breadcrumb).toBeVisible();
  await expect(breadcrumb.getByRole("link", { name: "All Projects" })).toBeVisible();

  const boxes = await breadcrumb.locator('a, [aria-current="page"]').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    }),
  );

  expect(boxes).toHaveLength(2);
  expect(boxes[0].width).toBeGreaterThan(0);
  expect(boxes[1].width).toBeGreaterThan(0);
  expect(boxes[1].left).toBeGreaterThanOrEqual(boxes[0].right);
}
