import { useMemo, useEffect, useRef } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { useWallsStore } from "@/features/walls/model/walls.store";
import { useRoofStore, Roof } from "./roof.store";
import { generateRoofSolid, RoofSolid } from "@/domain/structure/roofSolid";
import { getRoofMaterial, RoofMaterial } from "@/domain/structure/roofSystem";
import { RoofPlaneGeometry } from "@/domain/structure/roofTypes/gable";
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

  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const configRef = useRef(config);
  configRef.current = config;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  useEffect(() => {
    const faceIds = Object.keys(faces);
    if (faceIds.length === 0) {
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

/** Enriched plane data for the renderer. */
export interface RoofPlaneRenderData {
  plane: RoofPlaneGeometry;
  roof: Roof;
  material: RoofMaterial;
  isSelected: boolean;
}

export function useRoofPlanesWithMaterials(): RoofPlaneRenderData[] {
  const plan = useEditorStore((s) => s.plan);
  const roofs = useRoofStore((s) => s.roofs);
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

      const solid = generateRoofSolid(
        roof.id,
        roof.faceId,
        polygon,
        roof.roofType,
        roof.baseZ,
        roof.pitchDeg,
        roof.overhang,
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
  }, [plan.faces, plan.vertices, roofs, materials, planeSelection]);
}

/**
 * Aggregate stats for the roof layer.
 */
export function useRoofStats() {
  const roofs = useRoofStore((s) => s.roofs);
  const plan = useEditorStore((s) => s.plan);

  return useMemo(() => {
    const list = Object.values(roofs);

    // We need solids to compute plane count & total area
    let totalPlanes = 0;
    let totalArea = 0;

    for (const roof of list) {
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

      totalPlanes += solid.planes.length;
      for (const p of solid.planes) {
        totalArea += p.area;
      }
    }

    return {
      roofCount: list.length,
      planeCount: totalPlanes,
      totalArea,
      averagePitch:
        list.length > 0
          ? list.reduce((s, r) => s + r.pitchDeg, 0) / list.length
          : 0,
    };
  }, [roofs, plan.faces, plan.vertices]);
}

/**
 * Get data for the selected planes in the properties panel.
 */
export function useSelectedPlaneData(): {
  planes: (RoofPlaneGeometry & { roofId: string })[];
  roof: Roof | null;
} {
  const plan = useEditorStore((s) => s.plan);
  const roofs = useRoofStore((s) => s.roofs);
  const planeSelection = useRoofStore((s) => s.planeSelection);

  return useMemo(() => {
    if (planeSelection.planeIds.length === 0) {
      return { planes: [], roof: null };
    }

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

      const solid = generateRoofSolid(
        roof.id,
        roof.faceId,
        polygon,
        roof.roofType,
        roof.baseZ,
        roof.pitchDeg,
        roof.overhang,
      );

      for (const p of solid.planes) {
        if (selectedSet.has(p.planeId)) {
          planes.push({ ...p, roofId: roof.id });
          if (
            !primaryRoof &&
            planeSelection.primary &&
            p.planeId === planeSelection.primary
          ) {
            primaryRoof = roof;
          }
        }
      }
    }

    if (!primaryRoof && planes.length > 0) {
      primaryRoof =
        Object.values(roofs).find((r) => r.id === planes[0].roofId) ?? null;
    }

    return { planes, roof: primaryRoof };
  }, [plan.faces, plan.vertices, roofs, planeSelection]);
}
