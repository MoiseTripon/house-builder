export type RoofType = "flat" | "gable";

export interface RoofMaterial {
  id: string;
  name: string;
  color: string;
  roughness: number;
}

export interface RoofSystemConfig {
  defaultRoofType: RoofType;
  defaultPitchDeg: number;
  defaultOverhang: number;
  defaultMaterialId: string;
  minPitchDeg: number;
  maxPitchDeg: number;
  minOverhang: number;
  maxOverhang: number;
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
];

export const DEFAULT_ROOF_SYSTEM_CONFIG: RoofSystemConfig = {
  defaultRoofType: "gable",
  defaultPitchDeg: 30,
  defaultOverhang: 0,
  defaultMaterialId: "roof-tile-red",
  minPitchDeg: 0,
  maxPitchDeg: 60,
  minOverhang: 0,
  maxOverhang: 1500,
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
