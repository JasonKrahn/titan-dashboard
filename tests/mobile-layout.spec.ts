import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalDocumentOverflow,
  waitForStableLayout,
  takeMobileScreenshot,
} from "./helpers/mobile";

const artifactDir = path.join("artifacts", "mobile-layout");

/**
 * iOS Test Matrix
 *
 * Primary viewports (all routes):
 *   390×844   iPhone 14/15 portrait
 *   430×932   iPhone 14/15 Pro Max portrait
 *   768×1024  iPad Mini portrait — sits exactly on Tailwind md: (768px) boundary
 *
 * Boundary spot-check (dashboard, project, phase only):
 *   820×1180  iPad Air portrait — between md: and lg:
 *   1024×768  iPad Mini landscape — sits exactly on Tailwind lg: (1024px) boundary
 */

interface RouteDef {
  name: string;
  path: string;
  heading: string;
  /** Set to true if this route participates in the boundary spot-check. */
  boundarySpotCheck?: boolean;
}

const routes: RouteDef[] = [
  {
    name: "dashboard",
    path: "/",
    heading: "Clients",
    boundarySpotCheck: true,
  },
  {
    name: "project",
    path: "/project/proj-active-insulation",
    heading: "Fortress Cedar Point Villas",
    boundarySpotCheck: true,
  },
  {
    name: "phase",
    path: "/project/proj-active-insulation/phase/proj-active-insulation-phase-drywall",
    heading: "Drywall",
    boundarySpotCheck: true,
  },
  {
    name: "subs",
    path: "/subs",
    heading: "Subcontractor Rolodex",
  },
  {
    name: "archive",
    path: "/archive",
    heading: "Archive",
  },
  {
    name: "inventory",
    path: "/inventory",
    heading: "Inventory Tracker",
    boundarySpotCheck: true,
  },
];

const primaryViewports = [
  { width: 390, height: 844, label: "iphone14" },
  { width: 430, height: 932, label: "iphone14promax" },
  { width: 768, height: 1024, label: "ipadmini-portrait" },
] as const;

const boundaryViewports = [
  { width: 820, height: 1180, label: "ipadair-portrait" },
  { width: 1024, height: 768, label: "ipadmini-landscape" },
] as const;

// ──────────────────────────────────────────────────────────
// Primary viewport tests — all routes
// ──────────────────────────────────────────────────────────
for (const viewport of primaryViewports) {
  for (const route of routes) {
    test(`${route.name} at ${viewport.label} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route.path);
      await waitForStableLayout(page);

      // Assert key content is present in the main area
      await expect(page.locator("main")).toContainText(route.heading);

      await expectNoHorizontalDocumentOverflow(page);
      await takeMobileScreenshot(page, artifactDir, route.name, viewport.width, viewport.height);
    });
  }
}

// ──────────────────────────────────────────────────────────
// Boundary spot-check — critical routes at extra viewports
// ──────────────────────────────────────────────────────────
for (const viewport of boundaryViewports) {
  for (const route of routes.filter((r) => r.boundarySpotCheck)) {
    test(`${route.name} boundary-check at ${viewport.label} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route.path);
      await waitForStableLayout(page);

      await expect(page.locator("main")).toContainText(route.heading);

      await expectNoHorizontalDocumentOverflow(page);
      await takeMobileScreenshot(page, artifactDir, route.name, viewport.width, viewport.height);
    });
  }
}

// Note: Boundary-layout verification (e.g. whether iPad Mini portrait renders
// mobile or desktop elements at exactly 768px) is done via screenshot review
// rather than brittle CSS-class assertions. Inspect the artifacts produced
// at 768×1024 for the project and phase routes during the findings phase.
