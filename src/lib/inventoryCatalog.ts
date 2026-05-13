import type { PhaseType } from "@/lib/types";

export interface InventoryCatalogItem {
  itemKey: string;
  label: string;
}

export const INSULATION_MATERIALS: InventoryCatalogItem[] = [
  { itemKey: "r12_batt", label: "R-12 Batts" },
  { itemKey: "r14_batt", label: "R-14 Batts" },
  { itemKey: "r20_batt", label: "R-20 Batts" },
  { itemKey: "r22_batt", label: "R-22 Batts" },
  { itemKey: "r24_batt", label: "R-24 Batts" },
  { itemKey: "r28_batt", label: "R-28 Batts" },
  { itemKey: "r40_batt", label: "R-40 Batts" },
  { itemKey: "blown_in_bags", label: "Blown-in Bags" },
  { itemKey: "six_mil_poly_rolls", label: "6-mil Poly Rolls" },
  { itemKey: "acoustic_sealant", label: "Acoustic Sealant" },
  { itemKey: "spray_foam_cans", label: "Spray Foam Cans" },
  { itemKey: "two_part_closed_cell_foam_kits", label: "2-Part Closed-Cell Foam Kits" },
  { itemKey: "red_tuck_tape", label: "Red Tuck Tape" },
  { itemKey: "blue_tuck_tape", label: "Blue Tuck Tape" },
  { itemKey: "hammer_tacker_staples", label: "Hammer Tacker Staples" },
  { itemKey: "attic_baffle_vents", label: "Attic Baffle Vents" },
];

export const DRYWALL_MATERIALS: InventoryCatalogItem[] = [
  { itemKey: "half_inch_regular_board", label: '1/2" Regular Board' },
  { itemKey: "half_inch_lightweight_board", label: '1/2" Lightweight Board' },
  { itemKey: "type_x_board", label: '5/8" Type X Board' },
  { itemKey: "half_inch_moisture_resistant_board", label: '1/2" Moisture Resistant Board' },
  { itemKey: "quarter_inch_flex_board", label: '1/4" Flex Board' },
  { itemKey: "half_inch_cement_board", label: '1/2" Cement Board' },
  { itemKey: "quarter_inch_cement_board", label: '1/4" Cement Board' },
  { itemKey: "waterproofing_membrane_rolls", label: "Waterproofing Membrane rolls" },
  { itemKey: "thin_set_mortar_bags", label: "Thin-set Mortar bags" },
  { itemKey: "resilient_channel_rc1", label: "Resilient Channel (RC-1)" },
  { itemKey: "isolation_clips", label: "Isolation Clips" },
  { itemKey: "one_and_quarter_coarse_thread_screws", label: '1-1/4" Coarse Thread Screws' },
  { itemKey: "one_and_five_eighths_coarse_thread_screws", label: '1-5/8" Coarse Thread Screws' },
  { itemKey: "fine_thread_screws", label: "Fine Thread Screws" },
  { itemKey: "framing_screws", label: "Framing Screws" },
  { itemKey: "cement_board_screws", label: "Cement Board Screws" },
  { itemKey: "drywall_adhesive", label: "Drywall Adhesive" },
  { itemKey: "alkali_resistant_mesh_tape", label: "Alkali-Resistant Mesh Tape" },
];

export const FINISHING_MATERIALS: InventoryCatalogItem[] = [
  { itemKey: "yellow_mud_box", label: "Yellow Mud Box" },
  { itemKey: "green_mud_box", label: "Green Mud Box" },
  { itemKey: "setting_type_compound_90_min", label: "Setting-type Compound (90 min)" },
  { itemKey: "setting_type_compound_45_min", label: "Setting-type Compound (45 min)" },
  { itemKey: "setting_type_compound_20_min", label: "Setting-type Compound (20 min)" },
  { itemKey: "paper_tape", label: "Paper Tape" },
  { itemKey: "fibafuse_tape", label: "Fibafuse Tape" },
  { itemKey: "mesh_tape", label: "Mesh Tape" },
  { itemKey: "outside_corner_bead", label: "90° Outside Corner Bead" },
  { itemKey: "open_angle_bead", label: "130° / Open Angle Bead" },
  { itemKey: "inside_corner_bead", label: "Inside Corner Bead" },
  { itemKey: "l_bead_tear_away_bead", label: "L-Bead / Tear-away Bead" },
  { itemKey: "j_trim", label: "J-Trim" },
  { itemKey: "medium_sanding_sponges", label: "Medium Sanding Sponges" },
  { itemKey: "fine_sanding_sponges", label: "Fine Sanding Sponges" },
  { itemKey: "one_twenty_grit_pole_sheets", label: "120 Grit Pole Sheets" },
  { itemKey: "one_fifty_grit_pole_sheets", label: "150 Grit Pole Sheets" },
  { itemKey: "two_twenty_grit_pole_sheets", label: "220 Grit Pole Sheets" },
];

export const EQUIPMENT_ITEMS: InventoryCatalogItem[] = [
  { itemKey: "five_by_five_frame_sections", label: "5x5 Frame Sections" },
  { itemKey: "cross_braces", label: "Cross Braces" },
  { itemKey: "leveling_jacks", label: "Leveling Jacks" },
  { itemKey: "coupling_pins", label: "Coupling Pins" },
  { itemKey: "aluminum_walk_planks", label: "Aluminum Walk Planks" },
  { itemKey: "guardrails", label: "Guardrails" },
  { itemKey: "baker_scaffold", label: "Baker Scaffolds" },
  { itemKey: "four_foot_step_ladders", label: "4' Step Ladders" },
  { itemKey: "six_foot_step_ladders", label: "6' Step Ladders" },
  { itemKey: "eight_foot_step_ladders", label: "8' Step Ladders" },
  { itemKey: "extension_ladders", label: "Extension Ladders" },
  { itemKey: "drywall_lift", label: "Drywall Lifts" },
  { itemKey: "stilts", label: "Stilts" },
  { itemKey: "site_lighting", label: "Temporary Site Lighting" },
  { itemKey: "portable_heaters", label: "Portable Heaters" },
  { itemKey: "air_scrubbers", label: "Air Scrubbers" },
];

export const PHASE_MATERIAL_CATALOGS: Record<PhaseType, InventoryCatalogItem[]> = {
  insulation: INSULATION_MATERIALS,
  drywall: DRYWALL_MATERIALS,
  finishing: FINISHING_MATERIALS,
};
