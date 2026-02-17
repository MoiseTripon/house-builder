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
