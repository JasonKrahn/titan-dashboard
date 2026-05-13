import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

/**
 * Assert the document has no horizontal overflow.
 * Allows a 1px tolerance for scrollbar rounding.
 */
export async function expectNoHorizontalDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

/**
 * Wait for the page to reach a visually-stable state.
 * Useful after navigation or data loading.
 */
export async function waitForStableLayout(page: Page) {
  // Wait for the document to be fully loaded and a brief settling period.
  await page.waitForLoadState("networkidle");
  // Give React a tick to render post-query data.
  await page.waitForTimeout(300);
}

/**
 * Capture a full-page screenshot to a predictable artifacts path.
 */
export async function takeMobileScreenshot(page: Page, artifactDir: string, routeName: string, width: number, height: number) {
  await ensureDir(artifactDir);
  const fileName = `${routeName}-${width}x${height}.png`;
  await page.screenshot({
    path: path.join(artifactDir, fileName),
    fullPage: true,
  });
  return fileName;
}
