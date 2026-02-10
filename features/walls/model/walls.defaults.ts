import { WallSystemConfig } from "@/domain/structure/wallSystem";

/**
 * Preset configurations for different building types
 */
export const WALL_PRESETS: Record<string, Partial<WallSystemConfig>> = {
  residential: {
    defaultHeight: 2700,
    defaultThickness: 200,
  },
  commercial: {
    defaultHeight: 3500,
    defaultThickness: 250,
  },
  industrial: {
    defaultHeight: 6000,
    defaultThickness: 300,
  },
  garage: {
    defaultHeight: 2400,
    defaultThickness: 150,
  },
};

/**
 * Common wall heights (mm)
 */
export const COMMON_HEIGHTS = [
  { value: 2400, label: "2.4m (Standard)" },
  { value: 2700, label: "2.7m (Residential)" },
  { value: 3000, label: "3.0m (High Ceiling)" },
  { value: 3500, label: "3.5m (Commercial)" },
  { value: 4000, label: "4.0m" },
  { value: 5000, label: "5.0m" },
  { value: 6000, label: "6.0m (Industrial)" },
];

/**
 * Common wall thicknesses (mm)
 */
export const COMMON_THICKNESSES = [
  { value: 100, label: "100mm (Partition)" },
  { value: 150, label: "150mm (Interior)" },
  { value: 200, label: "200mm (Standard)" },
  { value: 250, label: "250mm (Exterior)" },
  { value: 300, label: "300mm (Load-bearing)" },
  { value: 400, label: "400mm (Heavy)" },
];
