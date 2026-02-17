import { useMemo, useEffect, useRef } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { useWallsStore } from "@/features/walls/model/walls.store";
import { useRoofStore, Roof } from "./roof.store";
import {
  generateRoofSolid,
  RoofSolid,
  RoofPlaneGeometry,
} from "@/domain/structure/roofSolid";
import { getRoofMaterial, RoofMaterial } from "@/domain/structure/roofSystem";
import {
  EdgeOverhangs,
  defaultEdgeOverhangs,
} from "@/domain/structure/roofTypes/common";
import { Vec2 } from "@/domain/geometry/vec2";

/* ------------------------------------------------------------------ */
/*  Auto-sync                                                          */
/* ------------------------------------------------------------------ */

export function useRoofSync() {
  const faces = useEditorStore((s) => s.plan.faces);
  const walls = useWallsStore((s) => s.walls);
  const wallConfig = useWallsStore((s) => s.config);
  const anchorToWalls = useRoofStore((s) => s.config.anchorToWalls);
  const syncWithFaces = useRoofStore((s) => s.syncWithFaces);

  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const wallConfigRef = useRef(wallConfig);
  wallConfigRef.current = wallConfig;

  useEffect(() => {
    const faceIds = Object.keys(faces);
    if (faceIds.length === 0) {
      syncWithFaces([], () => 0);
      return;
    }

    const wallTopForFace = (faceId: string): number => {
      if (!anchorToWalls) return wallConfigRef.current.defaultHeight;

      const face = faces[faceId];
      if (!face) return wallConfigRef.current.defaultHeight;

      let maxH = 0;
      for (const eid of face.edgeIds) {
        const wall = Object.values(wallsRef.current).find(
          (w) => w.edgeId === eid,
        );
        if (wall) maxH = Math.max(maxH, wall.baseZ + wall.height);
      }
      return maxH > 0 ? maxH : wallConfigRef.current.defaultHeight;
    };

    syncWithFaces(faceIds, wallTopForFace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faces, walls, anchorToWalls, syncWithFaces]);
}

/* ------------------------------------------------------------------ */
/*  Wall-thickness-adjusted overhangs                                  */
/* ------------------------------------------------------------------ */

/**
 * Computes the max wall thickness on a face's edges.
 * Used to push "zero overhang" to the outer wall face.
 */
function faceWallThickness(
  faceId: string,
  faces: Record<string, { edgeIds: string[] }>,
  walls: Record<string, { edgeId: string; thickness: number }>,
): number {
  const face = faces[faceId];
  if (!face) return 0;
  let maxT = 0;
  for (const eid of face.edgeIds) {
    const wall = Object.values(walls).find((w) => w.edgeId === eid);
    if (wall) maxT = Math.max(maxT, wall.thickness);
  }
  return maxT;
}

function adjustedOverhangs(
  userOverhangs: EdgeOverhangs,
  wallThickness: number,
): EdgeOverhangs {
  const half = wallThickness / 2;
  return {
    front: userOverhangs.front + half,
    back: userOverhangs.back + half,
    left: userOverhangs.left + half,
    right: userOverhangs.right + half,
  };
}

/* ------------------------------------------------------------------ */
/*  Solids                                                             */
/* ------------------------------------------------------------------ */

export function useRoofSolids(): RoofSolid[] {
  const plan = useEditorStore((s) => s.plan);
  const roofs = useRoofStore((s) => s.roofs);
  const walls = useWallsStore((s) => s.walls);

  return useMemo(() => {
    const solids: RoofSolid[] = [];
    for (const roof of Object.values(roofs)) {
      const face = plan.faces[roof.faceId];
      if (!face) continue;
      const polygon: Vec2[] = face.vertexIds
        .map((vid) => plan.vertices[vid]?.position)
        .filter(Boolean) as Vec2[];
      if (polygon.length < 3) continue;

      const wt = faceWallThickness(roof.faceId, plan.faces, walls);
      const oh = adjustedOverhangs(roof.edgeOverhangs, wt);

      solids.push(
        generateRoofSolid(
          roof.id,
          roof.faceId,
          polygon,
          roof.roofType,
          roof.baseZ,
          roof.pitchDeg,
          roof.lowerPitchDeg,
          oh,
          roof.ridgeOffset,
        ),
      );
    }
    return solids;
  }, [plan.faces, plan.vertices, roofs, walls]);
}

/* ------------------------------------------------------------------ */
/*  Per-plane render data                                              */
/* ------------------------------------------------------------------ */

export interface RoofPlaneRenderData {
  plane: RoofPlaneGeometry;
  roof: Roof;
  material: RoofMaterial;
  isSelected: boolean;
}

export function useRoofPlanesWithMaterials(): RoofPlaneRenderData[] {
  const plan = useEditorStore((s) => s.plan);
  const roofs = useRoofStore((s) => s.roofs);
  const walls = useWallsStore((s) => s.walls);
  const materials = useRoofStore((s) => s.materials);
  const planeSelection = useRoofStore((s) => s.planeSelection);

  return useMemo(() => {
    const result: RoofPlaneRenderData[] = [];
    for (const roof of Object.values(roofs)) {
      const face = plan.faces[roof.faceId];
      if (!face) continue;
      const polygon: Vec2[] = face.vertexIds
        .map((vid) => plan.vertices[vid]?.position)
        .filter(Boolean) as Vec2[];
      if (polygon.length < 3) continue;

      const wt = faceWallThickness(roof.faceId, plan.faces, walls);
      const oh = adjustedOverhangs(roof.edgeOverhangs, wt);

      const solid = generateRoofSolid(
        roof.id,
        roof.faceId,
        polygon,
        roof.roofType,
        roof.baseZ,
        roof.pitchDeg,
        roof.lowerPitchDeg,
        oh,
        roof.ridgeOffset,
      );

      const material = getRoofMaterial(roof.materialId, materials);
      for (const plane of solid.planes) {
        result.push({
          plane,
          roof,
          material,
          isSelected: planeSelection.planeIds.includes(plane.planeId),
        });
      }
    }
    return result;
  }, [plan.faces, plan.vertices, roofs, walls, materials, planeSelection]);
}

/* ------------------------------------------------------------------ */
/*  Stats                                                              */
/* ------------------------------------------------------------------ */

export function useRoofStats() {
  const solids = useRoofSolids();
  const roofs = useRoofStore((s) => s.roofs);

  return useMemo(() => {
    const list = Object.values(roofs);
    let totalPlanes = 0;
    let totalArea = 0;
    for (const s of solids) {
      totalPlanes += s.planes.length;
      for (const p of s.planes) totalArea += p.area;
    }
    return {
      roofCount: list.length,
      planeCount: totalPlanes,
      totalArea,
      averagePitch:
        list.length > 0
          ? list.reduce((a, r) => a + r.pitchDeg, 0) / list.length
          : 0,
    };
  }, [roofs, solids]);
}

/* ------------------------------------------------------------------ */
/*  Selected-plane data for PropertiesPanel                            */
/* ------------------------------------------------------------------ */

export function useSelectedPlaneData(): {
  planes: (RoofPlaneGeometry & { roofId: string })[];
  roof: Roof | null;
} {
  const plan = useEditorStore((s) => s.plan);
  const roofs = useRoofStore((s) => s.roofs);
  const walls = useWallsStore((s) => s.walls);
  const planeSelection = useRoofStore((s) => s.planeSelection);

  return useMemo(() => {
    if (planeSelection.planeIds.length === 0) return { planes: [], roof: null };

    const selectedSet = new Set(planeSelection.planeIds);
    const planes: (RoofPlaneGeometry & { roofId: string })[] = [];
    let primaryRoof: Roof | null = null;

    for (const roof of Object.values(roofs)) {
      const face = plan.faces[roof.faceId];
      if (!face) continue;
      const polygon: Vec2[] = face.vertexIds
        .map((vid) => plan.vertices[vid]?.position)
        .filter(Boolean) as Vec2[];
      if (polygon.length < 3) continue;

      const wt = faceWallThickness(roof.faceId, plan.faces, walls);
      const oh = adjustedOverhangs(roof.edgeOverhangs, wt);

      const solid = generateRoofSolid(
        roof.id,
        roof.faceId,
        polygon,
        roof.roofType,
        roof.baseZ,
        roof.pitchDeg,
        roof.lowerPitchDeg,
        oh,
        roof.ridgeOffset,
      );

      for (const p of solid.planes) {
        if (selectedSet.has(p.planeId)) {
          planes.push({ ...p, roofId: roof.id });
          if (!primaryRoof && planeSelection.primary === p.planeId)
            primaryRoof = roof;
        }
      }
    }

    if (!primaryRoof && planes.length > 0)
      primaryRoof =
        Object.values(roofs).find((r) => r.id === planes[0].roofId) ?? null;

    return { planes, roof: primaryRoof };
  }, [plan.faces, plan.vertices, roofs, walls, planeSelection]);
}
