import { describe, expect, it } from "vitest";
import {
  DRYWALL_MATERIALS,
  EQUIPMENT_ITEMS,
  FINISHING_MATERIALS,
  INSULATION_MATERIALS,
  PHASE_MATERIAL_CATALOGS,
} from "./inventoryCatalog";

const labels = (items: { label: string }[]) => items.map((item) => item.label);

function expectUniqueItemKeys(items: { itemKey: string }[]) {
  expect(new Set(items.map((item) => item.itemKey)).size).toBe(items.length);
}

describe("inventory catalogs", () => {
  it("defines the standard insulation material catalog", () => {
    expect(labels(INSULATION_MATERIALS)).toEqual([
      "R-12 Batts",
      "R-14 Batts",
      "R-20 Batts",
      "R-22 Batts",
      "R-24 Batts",
      "R-28 Batts",
      "R-40 Batts",
      "Blown-in Bags",
      "6-mil Poly Rolls",
      "Acoustic Sealant",
      "Spray Foam Cans",
      "2-Part Closed-Cell Foam Kits",
      "Red Tuck Tape",
      "Blue Tuck Tape",
      "Hammer Tacker Staples",
      "Attic Baffle Vents",
    ]);
    expectUniqueItemKeys(INSULATION_MATERIALS);
  });

  it("defines the standard drywall material catalog", () => {
    expect(labels(DRYWALL_MATERIALS)).toEqual([
      '1/2" Regular Board',
      '1/2" Lightweight Board',
      '5/8" Type X Board',
      '1/2" Moisture Resistant Board',
      '1/4" Flex Board',
      '1/2" Cement Board',
      '1/4" Cement Board',
      "Waterproofing Membrane rolls",
      "Thin-set Mortar bags",
      "Resilient Channel (RC-1)",
      "Isolation Clips",
      '1-1/4" Coarse Thread Screws',
      '1-5/8" Coarse Thread Screws',
      "Fine Thread Screws",
      "Framing Screws",
      "Cement Board Screws",
      "Drywall Adhesive",
      "Alkali-Resistant Mesh Tape",
    ]);
    expectUniqueItemKeys(DRYWALL_MATERIALS);
  });

  it("defines the standard finishing material catalog", () => {
    expect(labels(FINISHING_MATERIALS)).toEqual([
      "Yellow Mud Box",
      "Green Mud Box",
      "Setting-type Compound (90 min)",
      "Setting-type Compound (45 min)",
      "Setting-type Compound (20 min)",
      "Paper Tape",
      "Fibafuse Tape",
      "Mesh Tape",
      "90° Outside Corner Bead",
      "130° / Open Angle Bead",
      "Inside Corner Bead",
      "L-Bead / Tear-away Bead",
      "J-Trim",
      "Medium Sanding Sponges",
      "Fine Sanding Sponges",
      "120 Grit Pole Sheets",
      "150 Grit Pole Sheets",
      "220 Grit Pole Sheets",
    ]);
    expectUniqueItemKeys(FINISHING_MATERIALS);
  });

  it("defines the standard equipment catalog without wiring it to phase materials", () => {
    expect(labels(EQUIPMENT_ITEMS)).toEqual([
      "5x5 Frame Sections",
      "Cross Braces",
      "Leveling Jacks",
      "Coupling Pins",
      "Aluminum Walk Planks",
      "Guardrails",
      "Baker Scaffolds",
      "4' Step Ladders",
      "6' Step Ladders",
      "8' Step Ladders",
      "Extension Ladders",
      "Drywall Lifts",
      "Stilts",
      "Temporary Site Lighting",
      "Portable Heaters",
      "Air Scrubbers",
    ]);
    expectUniqueItemKeys(EQUIPMENT_ITEMS);
  });

  it("maps phase types to their material catalogs", () => {
    expect(PHASE_MATERIAL_CATALOGS.insulation).toBe(INSULATION_MATERIALS);
    expect(PHASE_MATERIAL_CATALOGS.drywall).toBe(DRYWALL_MATERIALS);
    expect(PHASE_MATERIAL_CATALOGS.finishing).toBe(FINISHING_MATERIALS);
  });
});
