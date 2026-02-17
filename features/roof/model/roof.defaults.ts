import {
  DEFAULT_ROOF_SYSTEM_CONFIG,
  DEFAULT_ROOF_MATERIALS,
  RoofSystemConfig,
  RoofMaterial,
} from "@/domain/structure/roofSystem";

export const ROOF_DEFAULTS: {
  config: RoofSystemConfig;
  materials: RoofMaterial[];
  show3DRoofs: boolean;
} = {
  config: DEFAULT_ROOF_SYSTEM_CONFIG,
  materials: DEFAULT_ROOF_MATERIALS,
  show3DRoofs: true,
};

export const COMMON_PITCHES: { label: string; value: number }[] = [
  { label: "15°", value: 15 },
  { label: "22°", value: 22 },
  { label: "30°", value: 30 },
  { label: "45°", value: 45 },
];

export const COMMON_LOWER_PITCHES: { label: string; value: number }[] = [
  { label: "45°", value: 45 },
  { label: "60°", value: 60 },
  { label: "70°", value: 70 },
  { label: "80°", value: 80 },
];

export const COMMON_OVERHANGS: { label: string; value: number }[] = [
  { label: "0", value: 0 },
  { label: "300mm", value: 300 },
  { label: "600mm", value: 600 },
  { label: "900mm", value: 900 },
];

export const COMMON_RIDGE_OFFSETS: { label: string; value: number }[] = [
  { label: "Center", value: 0 },
  { label: "+500", value: 500 },
  { label: "+1000", value: 1000 },
  { label: "−500", value: -500 },
];
