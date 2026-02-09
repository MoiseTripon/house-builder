"use client";

import React, { useMemo } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { getSelectedIds } from "@/features/editor/model/selection.types";
import { Vec2, distance } from "@/domain/geometry/vec2";
import {
  polygonSignedArea,
  interiorAngleAt,
  interiorArcSegments,
} from "@/domain/geometry/polygon";
import * as THREE from "three";

/**
 * Renders ONLY angle arc geometries (3D line segments inside the R3F canvas).
 * All text labels are rendered in the HTML overlay (see BuilderCanvas.tsx).
 */
export function AngleArcs() {
  const plan = useEditorStore((s) => s.plan);
  const selection = useEditorStore((s) => s.selection);

  const selectedFaceIds = getSelectedIds(selection, "face");
  const selectedVertexIds = getSelectedIds(selection, "vertex");

  /* ---- Face arcs ---- */
  const faceArcGeo = useMemo(() => {
    if (selectedFaceIds.length === 0) return null;
    let pts: number[] = [];

    for (const faceId of selectedFaceIds) {
      const face = plan.faces[faceId];
      if (!face || face.vertexIds.length < 3) continue;

      const positions = face.vertexIds
        .map((vid) => plan.vertices[vid]?.position)
        .filter(Boolean) as Vec2[];
      if (positions.length < 3) continue;

      const isCCW = polygonSignedArea(positions) > 0;
      const n = positions.length;

      for (let i = 0; i < n; i++) {
        const curr = positions[i];
        const prev = positions[(i - 1 + n) % n];
        const next = positions[(i + 1) % n];
        const arcR = Math.min(
          200,
          distance(curr, prev) * 0.2,
          distance(curr, next) * 0.2,
        );
        if (arcR > 10) {
          pts = pts.concat(
            interiorArcSegments(curr, prev, next, isCCW, arcR, 0.6, 32),
          );
        }
      }
    }

    if (pts.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [plan, selectedFaceIds]);

  /* ---- Vertex arcs ---- */
  const vertexArcGeo = useMemo(() => {
    if (selectedVertexIds.length === 0 || selectedFaceIds.length > 0)
      return null;
    let pts: number[] = [];

    for (const vid of selectedVertexIds) {
      if (!plan.vertices[vid]) continue;

      for (const face of Object.values(plan.faces)) {
        const idx = face.vertexIds.indexOf(vid);
        if (idx === -1) continue;

        const positions = face.vertexIds
          .map((fvid) => plan.vertices[fvid]?.position)
          .filter(Boolean) as Vec2[];
        if (positions.length < 3) continue;

        const n = positions.length;
        const curr = positions[idx];
        const prev = positions[(idx - 1 + n) % n];
        const next = positions[(idx + 1) % n];
        const isCCW = polygonSignedArea(positions) > 0;
        const arcR = Math.min(
          200,
          distance(curr, prev) * 0.2,
          distance(curr, next) * 0.2,
        );
        if (arcR > 10) {
          pts = pts.concat(
            interiorArcSegments(curr, prev, next, isCCW, arcR, 0.6, 32),
          );
        }
      }
    }

    if (pts.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [plan, selectedVertexIds, selectedFaceIds]);

  return (
    <group>
      {faceArcGeo && (
        <lineSegments geometry={faceArcGeo}>
          <lineBasicMaterial color="#f59e0b" opacity={0.9} transparent />
        </lineSegments>
      )}
      {vertexArcGeo && (
        <lineSegments geometry={vertexArcGeo}>
          <lineBasicMaterial color="#a855f7" opacity={0.9} transparent />
        </lineSegments>
      )}
    </group>
  );
}
