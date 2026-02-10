import { useEditorStore } from "@/features/editor/model/editor.store";
import { useWallsStore, Wall } from "./walls.store";
import { generateWallSolid, WallSolid } from "@/domain/structure/wallSolid";
import { getWallMaterial } from "@/domain/structure/wallSystem";
import { useMemo } from "react";

/**
 * Get all wall solids for rendering
 */
export function useWallSolids(): WallSolid[] {
  const plan = useEditorStore((s) => s.plan);
  const walls = useWallsStore((s) => s.walls);

  return useMemo(() => {
    const solids: WallSolid[] = [];

    for (const wall of Object.values(walls)) {
      const edge = plan.edges[wall.edgeId];
      if (!edge) continue;

      const startVertex = plan.vertices[edge.startId];
      const endVertex = plan.vertices[edge.endId];
      if (!startVertex || !endVertex) continue;

      const solid = generateWallSolid(
        wall.id,
        wall.edgeId,
        startVertex.position,
        endVertex.position,
        wall.thickness,
        wall.height,
        wall.baseZ,
      );

      solids.push(solid);
    }

    return solids;
  }, [plan.edges, plan.vertices, walls]);
}

/**
 * Get wall solids with their material info for rendering
 */
export function useWallSolidsWithMaterials(): Array<{
  solid: WallSolid;
  wall: Wall;
  material: ReturnType<typeof getWallMaterial>;
  isSelected: boolean;
  isHovered: boolean;
}> {
  const plan = useEditorStore((s) => s.plan);
  const hoveredItem = useEditorStore((s) => s.hoveredItem);
  const walls = useWallsStore((s) => s.walls);
  const materials = useWallsStore((s) => s.materials);
  const selection = useWallsStore((s) => s.selection);

  return useMemo(() => {
    const result: Array<{
      solid: WallSolid;
      wall: Wall;
      material: ReturnType<typeof getWallMaterial>;
      isSelected: boolean;
      isHovered: boolean;
    }> = [];

    for (const wall of Object.values(walls)) {
      const edge = plan.edges[wall.edgeId];
      if (!edge) continue;

      const startVertex = plan.vertices[edge.startId];
      const endVertex = plan.vertices[edge.endId];
      if (!startVertex || !endVertex) continue;

      const solid = generateWallSolid(
        wall.id,
        wall.edgeId,
        startVertex.position,
        endVertex.position,
        wall.thickness,
        wall.height,
        wall.baseZ,
      );

      const material = getWallMaterial(wall.materialId, materials);
      const isSelected = selection.wallIds.includes(wall.id);
      const isHovered =
        hoveredItem?.type === "edge" && hoveredItem.id === wall.edgeId;

      result.push({ solid, wall, material, isSelected, isHovered });
    }

    return result;
  }, [plan.edges, plan.vertices, walls, materials, selection, hoveredItem]);
}

/**
 * Get statistics about walls
 */
export function useWallStats() {
  const walls = useWallsStore((s) => s.walls);
  const plan = useEditorStore((s) => s.plan);

  return useMemo(() => {
    const wallList = Object.values(walls);
    let totalLength = 0;
    let totalArea = 0;

    for (const wall of wallList) {
      const edge = plan.edges[wall.edgeId];
      if (!edge) continue;

      const start = plan.vertices[edge.startId];
      const end = plan.vertices[edge.endId];
      if (!start || !end) continue;

      const dx = end.position.x - start.position.x;
      const dy = end.position.y - start.position.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      totalLength += length;
      totalArea += length * wall.height;
    }

    return {
      count: wallList.length,
      totalLength, // mm
      totalArea, // mm²
      averageHeight:
        wallList.length > 0
          ? wallList.reduce((sum, w) => sum + w.height, 0) / wallList.length
          : 0,
    };
  }, [walls, plan.edges, plan.vertices]);
}

/**
 * Check if walls are synced with plan edges
 */
export function useWallsSyncStatus() {
  const plan = useEditorStore((s) => s.plan);
  const walls = useWallsStore((s) => s.walls);

  return useMemo(() => {
    const planEdgeIds = new Set(Object.keys(plan.edges));
    const wallEdgeIds = new Set(Object.values(walls).map((w) => w.edgeId));

    const missingWalls = [...planEdgeIds].filter((id) => !wallEdgeIds.has(id));
    const orphanedWalls = [...wallEdgeIds].filter((id) => !planEdgeIds.has(id));

    return {
      isSynced: missingWalls.length === 0 && orphanedWalls.length === 0,
      missingWalls,
      orphanedWalls,
    };
  }, [plan.edges, walls]);
}
