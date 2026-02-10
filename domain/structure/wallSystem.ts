import { z } from "zod";

/**
 * Wall system configuration - materials, defaults, etc.
 */

export const WallMaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  roughness: z.number().min(0).max(1).default(0.8),
});

export type WallMaterial = z.infer<typeof WallMaterialSchema>;

export const WallSystemConfigSchema = z.object({
  defaultHeight: z.number().positive().default(2700), // mm
  defaultThickness: z.number().positive().default(200), // mm
  defaultMaterialId: z.string().default("concrete"),
  minHeight: z.number().positive().default(1000),
  maxHeight: z.number().positive().default(12000),
  minThickness: z.number().positive().default(50),
  maxThickness: z.number().positive().default(600),
});

export type WallSystemConfig = z.infer<typeof WallSystemConfigSchema>;

export const DEFAULT_WALL_MATERIALS: WallMaterial[] = [
  { id: "concrete", name: "Concrete", color: "#9ca3af", roughness: 0.9 },
  { id: "brick", name: "Brick", color: "#b45309", roughness: 0.85 },
  { id: "wood", name: "Wood", color: "#a16207", roughness: 0.7 },
  { id: "drywall", name: "Drywall", color: "#e5e7eb", roughness: 0.95 },
  { id: "glass", name: "Glass", color: "#67e8f9", roughness: 0.1 },
];

export const DEFAULT_WALL_SYSTEM_CONFIG: WallSystemConfig = {
  defaultHeight: 2700,
  defaultThickness: 200,
  defaultMaterialId: "concrete",
  minHeight: 1000,
  maxHeight: 12000,
  minThickness: 50,
  maxThickness: 600,
};

export function getWallMaterial(
  materialId: string,
  materials: WallMaterial[] = DEFAULT_WALL_MATERIALS,
): WallMaterial {
  return (
    materials.find((m) => m.id === materialId) ??
    materials[0] ?? {
      id: "default",
      name: "Default",
      color: "#9ca3af",
      roughness: 0.8,
    }
  );
}
