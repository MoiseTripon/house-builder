export type RoofType =
  | "flat"
  | "gable"
  | "hip"
  | "shed"
  | "gambrel"
  | "mansard";

export interface RoofMaterial {
  id: string;
  name: string;
  color: string;
  roughness: number;
}

export interface RoofSystemConfig {
  defaultRoofType: RoofType;
  defaultPitchDeg: number;
  defaultLowerPitchDeg: number;
  defaultOverhang: number;
  defaultMaterialId: string;
  anchorToWalls: boolean;
  minPitchDeg: number;
  maxPitchDeg: number;
  minLowerPitchDeg: number;
  maxLowerPitchDeg: number;
  minOverhang: number;
  maxOverhang: number;
  maxRidgeOffset: number;
}

export const DEFAULT_ROOF_MATERIALS: RoofMaterial[] = [
  { id: "roof-tile-red", name: "Red Tile", color: "#b44a3b", roughness: 0.8 },
  {
    id: "roof-tile-grey",
    name: "Grey Tile",
    color: "#6b7280",
    roughness: 0.75,
  },
  { id: "roof-slate", name: "Slate", color: "#475569", roughness: 0.6 },
  { id: "roof-metal", name: "Metal Sheet", color: "#94a3b8", roughness: 0.3 },
  { id: "roof-shingle", name: "Shingle", color: "#78716c", roughness: 0.85 },
];

export const DEFAULT_ROOF_SYSTEM_CONFIG: RoofSystemConfig = {
  defaultRoofType: "gable",
  defaultPitchDeg: 30,
  defaultLowerPitchDeg: 60,
  defaultOverhang: 0,
  defaultMaterialId: "roof-tile-red",
  anchorToWalls: true,
  minPitchDeg: 0,
  maxPitchDeg: 60,
  minLowerPitchDeg: 30,
  maxLowerPitchDeg: 85,
  minOverhang: 0,
  maxOverhang: 2000,
  maxRidgeOffset: 3000,
};

export function getRoofMaterial(
  materialId: string,
  materials: RoofMaterial[],
): RoofMaterial {
  return (
    materials.find((m) => m.id === materialId) ??
    materials[0] ??
    DEFAULT_ROOF_MATERIALS[0]
  );
}
