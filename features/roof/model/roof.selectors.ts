import { useMemo, useEffect, useRef } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { useWallsStore } from "@/features/walls/model/walls.store";
import { useRoofStore, Roof } from "./roof.store";
import { generateRoofSolid, RoofSolid } from "@/domain/structure/roofSolid";
import { getRoofMaterial, RoofMaterial } from "@/domain/structure/roofSystem";
import { Vec2 } from "@/domain/geometry/vec2";

/* ------------------------------------------------------------------ */
/*  Auto-sync: keep roofs in sync with plan faces & wall heights      */
/* ------------------------------------------------------------------ */

export function useRoofSync() {
  const faces = useEditorStore((s) => s.plan.faces);
  const edges = useEditorStore((s) => s.plan.edges);
  const walls = useWallsStore((s) => s.walls);
  const config = useWallsStore((s) => s.config);
  const syncWithFaces = useRoofStore((s) => s.syncWithFaces);

  // Keep a ref so the effect closure always sees the latest walls
  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const configRef = useRef(config);
  configRef.current = config;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  useEffect(() => {
    const faceIds = Object.keys(faces);
    if (faceIds.length === 0) {
      // No faces → clear roofs
      syncWithFaces([], () => 0);
      return;
    }

    const wallTopForFace = (faceId: string): number => {
      const face = faces[faceId];
      if (!face) return configRef.current.defaultHeight;

      let maxH = 0;
      for (const eid of face.edgeIds) {
        const wall = Object.values(wallsRef.current).find(
          (w) => w.edgeId === eid,
        );
        if (wall) {
          maxH = Math.max(maxH, wall.baseZ + wall.height);
        }
      }
      return maxH > 0 ? maxH : configRef.current.defaultHeight;
    };

    syncWithFaces(faceIds, wallTopForFace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faces, walls, syncWithFaces]);
}

/* ------------------------------------------------------------------ */
/*  Solid generation                                                  */
/* ------------------------------------------------------------------ */

export function useRoofSolids(): RoofSolid[] {
  const plan = useEditorStore((s) => s.plan);
  const roofs = useRoofStore((s) => s.roofs);

  return useMemo(() => {
    const solids: RoofSolid[] = [];

    for (const roof of Object.values(roofs)) {
      const face = plan.faces[roof.faceId];
      if (!face) continue;

      const polygon: Vec2[] = face.vertexIds
        .map((vid) => plan.vertices[vid]?.position)
        .filter(Boolean) as Vec2[];

      if (polygon.length < 3) continue;

      solids.push(
        generateRoofSolid(
          roof.id,
          roof.faceId,
          polygon,
          roof.roofType,
          roof.baseZ,
          roof.pitchDeg,
          roof.overhang,
        ),
      );
    }

    return solids;
  }, [plan.faces, plan.vertices, roofs]);
}

/**
 * Roof solids enriched with material / selection state for the renderer.
 */
export function useRoofSolidsWithMaterials(): Array<{
  solid: RoofSolid;
  roof: Roof;
  material: RoofMaterial;
  isSelected: boolean;
}> {
  const plan = useEditorStore((s) => s.plan);
  const roofs = useRoofStore((s) => s.roofs);
  const materials = useRoofStore((s) => s.materials);
  const selection = useRoofStore((s) => s.selection);

  return useMemo(() => {
    const result: Array<{
      solid: RoofSolid;
      roof: Roof;
      material: RoofMaterial;
      isSelected: boolean;
    }> = [];

    for (const roof of Object.values(roofs)) {
      const face = plan.faces[roof.faceId];
      if (!face) continue;

      const polygon: Vec2[] = face.vertexIds
        .map((vid) => plan.vertices[vid]?.position)
        .filter(Boolean) as Vec2[];
      if (polygon.length < 3) continue;

      const solid = generateRoofSolid(
        roof.id,
        roof.faceId,
        polygon,
        roof.roofType,
        roof.baseZ,
        roof.pitchDeg,
        roof.overhang,
      );

      result.push({
        solid,
        roof,
        material: getRoofMaterial(roof.materialId, materials),
        isSelected: selection.roofIds.includes(roof.id),
      });
    }

    return result;
  }, [plan.faces, plan.vertices, roofs, materials, selection]);
}

/**
 * Aggregate stats for the roof layer.
 */
export function useRoofStats() {
  const roofs = useRoofStore((s) => s.roofs);

  return useMemo(() => {
    const list = Object.values(roofs);
    return {
      count: list.length,
      averagePitch:
        list.length > 0
          ? list.reduce((s, r) => s + r.pitchDeg, 0) / list.length
          : 0,
    };
  }, [roofs]);
}
