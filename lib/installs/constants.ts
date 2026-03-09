// Scale: 1 foot = 0.3 scene units for 3D rendering
export const FEET_TO_UNITS = 0.3;

// ============================================
// R-VALUE DEFAULTS BY CONSTRUCTION TYPE
// ============================================
export const WALL_R_VALUES: Record<string, number> = {
  'uninsulated': 4,
  '2x4_r11': 11,
  '2x4_r13': 13,
  '2x4_r15': 15,
  '2x6_r19': 19,
  '2x6_r21': 21,
  'brick_uninsulated': 5,
  'brick_r11': 14,
  'block_uninsulated': 3,
  'block_r8': 11,
  'sip_4in': 15,
  'sip_6in': 23,
  'icf': 22,
};

export const CEILING_R_VALUES: Record<string, number> = {
  'uninsulated': 3,
  'r19': 19,
  'r30': 30,
  'r38': 38,
  'r49': 49,
  'r60': 60,
};

export const FLOOR_R_VALUES: Record<string, { rValue: number; tempDiff: number }> = {
  'slab': { rValue: 0, tempDiff: 0 },         // slab-on-grade: minimal floor loss
  'crawlspace': { rValue: 11, tempDiff: 15 },  // vented crawl
  'basement': { rValue: 5, tempDiff: 10 },      // conditioned basement
  'over_garage': { rValue: 19, tempDiff: 20 },  // unconditioned garage below
  'second_floor': { rValue: 0, tempDiff: 0 },   // above conditioned space
};

// ============================================
// WINDOW DEFAULTS
// ============================================
export const WINDOW_U_FACTORS: Record<string, number> = {
  'single': 1.10,
  'double': 0.49,
  'double_low_e': 0.30,
  'triple': 0.30,
  'triple_low_e': 0.18,
};

export const WINDOW_SHGC: Record<string, number> = {
  'single': 0.86,
  'double': 0.56,
  'double_low_e': 0.27,
  'triple': 0.41,
  'triple_low_e': 0.22,
};

// ============================================
// SOLAR HEAT GAIN FACTORS BY ORIENTATION (BTU/hr per sqft of glass)
// For 30-35 deg latitude (Florida/Southern US)
// ============================================
export const SOLAR_GAIN_FACTORS: Record<string, number> = {
  'N': 20,
  'NE': 45,
  'E': 80,
  'SE': 90,
  'S': 75,
  'SW': 90,
  'W': 80,
  'NW': 45,
};

// ============================================
// INFILTRATION RATES (ACH - air changes per hour)
// ============================================
export const INFILTRATION_ACH: Record<string, number> = {
  'tight': 0.25,       // new construction, spray foam, blower-door tested
  'average': 0.50,     // typical existing home, some sealing
  'leaky': 0.75,       // older home, minimal sealing
  'very_leaky': 1.0,   // old home, no improvements
};

// ============================================
// INTERNAL LOAD DEFAULTS
// ============================================
export const INTERNAL_LOADS = {
  PERSON_SENSIBLE_BTUH: 230,
  PERSON_LATENT_BTUH: 200,
  KITCHEN_BTUH: 1200,
  FIREPLACE_BTUH: -500, // net loss due to draft
};

// ============================================
// DUCT LOSS FACTORS
// ============================================
export const DUCT_LOSS_FACTORS: Record<string, number> = {
  'conditioned_space': 0.05,   // 5% loss
  'attic_insulated': 0.10,     // 10% loss
  'attic_uninsulated': 0.20,   // 20% loss
  'crawlspace_insulated': 0.10,
  'crawlspace_uninsulated': 0.15,
  'garage': 0.15,
};

// ============================================
// DUCT SIZING TABLE (equal friction method)
// CFM -> recommended round duct diameter (inches)
// Based on 0.08 in. w.c. per 100 ft friction rate
// ============================================
export const DUCT_SIZING_TABLE: Array<{ maxCFM: number; diameter: number }> = [
  { maxCFM: 40, diameter: 4 },
  { maxCFM: 65, diameter: 5 },
  { maxCFM: 100, diameter: 6 },
  { maxCFM: 150, diameter: 7 },
  { maxCFM: 200, diameter: 8 },
  { maxCFM: 280, diameter: 9 },
  { maxCFM: 375, diameter: 10 },
  { maxCFM: 500, diameter: 12 },
  { maxCFM: 700, diameter: 14 },
  { maxCFM: 950, diameter: 16 },
  { maxCFM: 1250, diameter: 18 },
  { maxCFM: 1600, diameter: 20 },
  { maxCFM: 2000, diameter: 22 },
  { maxCFM: 2500, diameter: 24 },
];

// Default friction rate (in. w.c. per 100 ft)
export const DEFAULT_FRICTION_RATE = 0.08;

// CFM per ton for cooling
export const CFM_PER_TON = 400;

// ============================================
// DESIGN TEMPERATURE DEFAULTS BY REGION
// (ASHRAE 99.6% heating / 0.4% cooling)
// ============================================
export const DESIGN_TEMPS_BY_REGION: Record<string, { cooling: number; heating: number }> = {
  // Florida
  'tallahassee': { cooling: 95, heating: 27 },
  'jacksonville': { cooling: 96, heating: 29 },
  'orlando': { cooling: 95, heating: 35 },
  'miami': { cooling: 93, heating: 47 },
  'tampa': { cooling: 93, heating: 36 },
  'pensacola': { cooling: 95, heating: 26 },
  // Southeast
  'atlanta': { cooling: 95, heating: 18 },
  'charlotte': { cooling: 95, heating: 19 },
  'nashville': { cooling: 96, heating: 11 },
  'birmingham': { cooling: 96, heating: 18 },
  'new_orleans': { cooling: 95, heating: 30 },
  // Northeast
  'new_york': { cooling: 93, heating: 11 },
  'boston': { cooling: 91, heating: 6 },
  'philadelphia': { cooling: 93, heating: 12 },
  // Midwest
  'chicago': { cooling: 93, heating: -3 },
  'detroit': { cooling: 91, heating: 3 },
  'minneapolis': { cooling: 92, heating: -12 },
  // Southwest
  'phoenix': { cooling: 110, heating: 34 },
  'las_vegas': { cooling: 108, heating: 25 },
  'dallas': { cooling: 102, heating: 19 },
  'houston': { cooling: 97, heating: 29 },
  'san_antonio': { cooling: 100, heating: 25 },
  // West
  'los_angeles': { cooling: 93, heating: 41 },
  'san_francisco': { cooling: 84, heating: 35 },
  'seattle': { cooling: 88, heating: 23 },
  'denver': { cooling: 95, heating: 1 },
  'portland': { cooling: 93, heating: 21 },
};

// ============================================
// HVAC BRANDS
// ============================================
export const HVAC_BRANDS = [
  'Carrier', 'Trane', 'Lennox', 'Goodman', 'Rheem', 'Ruud',
  'York', 'Daikin', 'Mitsubishi', 'Fujitsu', 'Amana', 'American Standard',
  'Bryant', 'Heil', 'Tempstar', 'Coleman', 'Payne', 'Maytag',
  'Bosch', 'Napoleon', 'Gree', 'LG', 'Samsung', 'Honeywell',
  'Emerson', 'White-Rodgers', 'Ecobee', 'Nest', 'Other',
];

// ============================================
// REFRIGERANT TYPES
// ============================================
export const REFRIGERANT_TYPES = [
  'R-410A', 'R-32', 'R-454B', 'R-22 (legacy)', 'R-407C', 'R-134a',
];

// ============================================
// 3D VIEWER COLORS
// ============================================
export const VIEWER_COLORS = {
  WALL: '#e0e0e0',
  WALL_OPACITY: 0.6,
  FLOOR: '#d4cfc7',
  CEILING: '#ffffff',
  CEILING_OPACITY: 0.15,
  SUPPLY_DUCT: '#7eb8e0',
  RETURN_DUCT: '#e07e7e',
  DUCT_OPACITY: 0.85,
  SUPPLY_VENT: '#42a5f5',
  RETURN_VENT: '#e55b2b',
  AIR_HANDLER: '#0a1f3f',
  CONDENSER: '#4a6580',
  SELECTED_OUTLINE: '#f5a623',
  GRID: '#cccccc',
  GROUND: '#f5f5f0',
};

// ============================================
// DEFAULT MATERIAL COSTS
// ============================================
export const DEFAULT_MATERIAL_COSTS: Record<string, { unit: string; cost: number }> = {
  'flex_duct_6in': { unit: 'linear_foot', cost: 1.50 },
  'flex_duct_8in': { unit: 'linear_foot', cost: 2.00 },
  'flex_duct_10in': { unit: 'linear_foot', cost: 2.75 },
  'flex_duct_12in': { unit: 'linear_foot', cost: 3.50 },
  'sheet_metal_duct': { unit: 'linear_foot', cost: 8.00 },
  'duct_tape': { unit: 'roll', cost: 8.00 },
  'mastic_sealant': { unit: 'gallon', cost: 15.00 },
  'line_set_3/8_3/4': { unit: 'linear_foot', cost: 4.50 },
  'line_set_3/8_7/8': { unit: 'linear_foot', cost: 5.50 },
  'refrigerant_r410a': { unit: 'lb', cost: 15.00 },
  'drain_line_3/4_pvc': { unit: 'linear_foot', cost: 1.25 },
  'safety_float_switch': { unit: 'each', cost: 12.00 },
  'condensate_pump': { unit: 'each', cost: 65.00 },
  'concrete_pad': { unit: 'each', cost: 35.00 },
  'disconnect_60a': { unit: 'each', cost: 25.00 },
  'whip_6ft': { unit: 'each', cost: 18.00 },
  'thermostat_wire': { unit: 'linear_foot', cost: 0.35 },
  'supply_register_6x10': { unit: 'each', cost: 8.00 },
  'supply_register_8x12': { unit: 'each', cost: 12.00 },
  'return_grille_14x20': { unit: 'each', cost: 15.00 },
  'return_grille_20x25': { unit: 'each', cost: 22.00 },
  'filter_16x25x1': { unit: 'each', cost: 5.00 },
  'filter_20x25x1': { unit: 'each', cost: 6.00 },
  'filter_20x25x4': { unit: 'each', cost: 18.00 },
  'plenum_box': { unit: 'each', cost: 45.00 },
  'start_collar_6in': { unit: 'each', cost: 5.00 },
  'start_collar_8in': { unit: 'each', cost: 6.00 },
  'elbow_6in': { unit: 'each', cost: 7.00 },
  'elbow_8in': { unit: 'each', cost: 9.00 },
  'wye_fitting': { unit: 'each', cost: 12.00 },
  'reducer': { unit: 'each', cost: 8.00 },
  'hanging_strap': { unit: 'linear_foot', cost: 0.50 },
};

// ============================================
// PROJECT STATUS DISPLAY
// ============================================
export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'draft': { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  'survey': { label: 'Site Survey', color: 'bg-blue-100 text-blue-700' },
  'designing': { label: 'Designing', color: 'bg-purple-100 text-purple-700' },
  'proposal_sent': { label: 'Proposal Sent', color: 'bg-amber-100 text-amber-700' },
  'accepted': { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  'scheduled': { label: 'Scheduled', color: 'bg-cyan-100 text-cyan-700' },
  'in_progress': { label: 'In Progress', color: 'bg-orange-100 text-orange-700' },
  'completed': { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};
