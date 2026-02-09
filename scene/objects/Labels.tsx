"use client";

import React, { useMemo } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { Html } from "@react-three/drei";
import {
  Vec2,
  distance,
  midpoint,
  sub,
  normalize,
  scale,
  perpCCW,
} from "@/domain/geometry/vec2";
import { formatLength } from "@/domain/units/units";
import {
  getSelectedIds,
  isSelected,
} from "@/features/editor/model/selection.types";
import {
  polygonSignedArea,
  interiorAngleAt,
  interiorArcSegments,
  angleLabelPosition,
} from "@/domain/geometry/polygon";
import * as THREE from "three";

function radToDeg(r: number) {
  return (r * 180) / Math.PI;
}

export function Labels() {
  const plan = useEditorStore((s) => s.plan);
  const unitConfig = useEditorStore((s) => s.unitConfig);
  const selection = useEditorStore((s) => s.selection);

  const selectedFaceIds = getSelectedIds(selection, "face");
  const selectedVertexIds = getSelectedIds(selection, "vertex");

  /* ================================================================
     Build a set of edges that belong to at least one face.
     ================================================================ */
  const edgesInFaces = useMemo(() => {
    const set = new Set<string>();
    for (const face of Object.values(plan.faces)) {
      for (const eid of face.edgeIds) set.add(eid);
    }
    return set;
  }, [plan.faces]);

  /* ================================================================
     EDGE LENGTH LABELS — every edge, always
     ================================================================ */
  const edgeLabels = useMemo(() => {
    return Object.values(plan.edges)
      .map((edge) => {
        const startV = plan.vertices[edge.startId];
        const endV = plan.vertices[edge.endId];
        if (!startV || !endV) return null;

        const len = distance(startV.position, endV.position);
        if (len < 1) return null;

        const mid = midpoint(startV.position, endV.position);
        const dir = sub(endV.position, startV.position);
        const perp = normalize(perpCCW(dir));
        const labelPos: Vec2 = {
          x: mid.x + perp.x * 120,
          y: mid.y + perp.y * 120,
        };

        const label = formatLength(len, unitConfig);
        const isSel = isSelected(selection, "edge", edge.id);
        const isOrphan = !edgesInFaces.has(edge.id);

        return { id: edge.id, pos: labelPos, label, isSel, isOrphan };
      })
      .filter(Boolean) as {
      id: string;
      pos: Vec2;
      label: string;
      isSel: boolean;
      isOrphan: boolean;
    }[];
  }, [plan.edges, plan.vertices, unitConfig, selection, edgesInFaces]);

  /* ================================================================
     Angle data for selected FACE(s)
     ================================================================ */
  const faceAngleItems = useMemo(() => {
    if (selectedFaceIds.length === 0)
      return {
        arcs: [] as number[],
        labels: [] as { pos: Vec2; deg: number; key: string }[],
      };

    let allArcPts: number[] = [];
    const labels: { pos: Vec2; deg: number; key: string }[] = [];

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

        const angleRad = interiorAngleAt(positions, i);
        const angleDeg = radToDeg(angleRad);

        const arcRadius = Math.min(
          200,
          distance(curr, prev) * 0.2,
          distance(curr, next) * 0.2,
        );

        if (arcRadius > 10) {
          const segData = interiorArcSegments(
            curr,
            prev,
            next,
            isCCW,
            arcRadius,
            0.6,
            32,
          );
          allArcPts = allArcPts.concat(segData);
        }

        const labelDist = Math.min(
          350,
          distance(curr, prev) * 0.3,
          distance(curr, next) * 0.3,
        );

        const lp = angleLabelPosition(
          curr,
          prev,
          next,
          isCCW,
          Math.max(labelDist, 150),
        );

        labels.push({
          pos: lp,
          deg: angleDeg,
          key: `fa_${faceId}_${face.vertexIds[i]}`,
        });
      }
    }

    return { arcs: allArcPts, labels };
  }, [plan, selectedFaceIds]);

  /* ================================================================
     Angle data for selected VERTEX(es) — from containing faces
     (skip if a face is already selected to avoid double-drawing)
     ================================================================ */
  const vertexAngleItems = useMemo(() => {
    if (selectedVertexIds.length === 0 || selectedFaceIds.length > 0) {
      return {
        arcs: [] as number[],
        labels: [] as { pos: Vec2; deg: number; key: string }[],
      };
    }

    let allArcPts: number[] = [];
    const labels: { pos: Vec2; deg: number; key: string }[] = [];

    for (const vertexId of selectedVertexIds) {
      const vertex = plan.vertices[vertexId];
      if (!vertex) continue;

      const containingFaces = Object.values(plan.faces).filter((f) =>
        f.vertexIds.includes(vertexId),
      );

      for (const face of containingFaces) {
        const positions = face.vertexIds
          .map((vid) => plan.vertices[vid]?.position)
          .filter(Boolean) as Vec2[];
        if (positions.length < 3) continue;

        const idx = face.vertexIds.indexOf(vertexId);
        if (idx === -1) continue;

        const n = positions.length;
        const curr = positions[idx];
        const prev = positions[(idx - 1 + n) % n];
        const next = positions[(idx + 1) % n];
        const isCCW = polygonSignedArea(positions) > 0;

        const angleRad = interiorAngleAt(positions, idx);
        const angleDeg = radToDeg(angleRad);

        const arcRadius = Math.min(
          200,
          distance(curr, prev) * 0.2,
          distance(curr, next) * 0.2,
        );

        if (arcRadius > 10) {
          const segData = interiorArcSegments(
            curr,
            prev,
            next,
            isCCW,
            arcRadius,
            0.6,
            32,
          );
          allArcPts = allArcPts.concat(segData);
        }

        const labelDist = Math.min(
          350,
          distance(curr, prev) * 0.3,
          distance(curr, next) * 0.3,
        );

        const lp = angleLabelPosition(
          curr,
          prev,
          next,
          isCCW,
          Math.max(labelDist, 150),
        );

        labels.push({
          pos: lp,
          deg: angleDeg,
          key: `va_${vertexId}_${face.id}`,
        });
      }
    }

    return { arcs: allArcPts, labels };
  }, [plan, selectedVertexIds, selectedFaceIds]);

  /* ================================================================
     Build THREE geometries for arc segments
     ================================================================ */
  const faceArcGeo = useMemo(() => {
    if (faceAngleItems.arcs.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(faceAngleItems.arcs, 3),
    );
    return geo;
  }, [faceAngleItems.arcs]);

  const vertexArcGeo = useMemo(() => {
    if (vertexAngleItems.arcs.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertexAngleItems.arcs, 3),
    );
    return geo;
  }, [vertexAngleItems.arcs]);

  return (
    <group>
      {/* ---- EDGE LENGTH LABELS ---- */}
      {edgeLabels.map((item) => (
        <Html
          key={`el_${item.id}`}
          position={[item.pos.x, item.pos.y, 1]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[10, 0]}
        >
          <div
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border select-none ${
              item.isSel
                ? "bg-blue-500/90 text-white border-blue-400"
                : item.isOrphan
                  ? "bg-orange-500/80 text-white border-orange-400"
                  : "bg-background/80 backdrop-blur-sm text-foreground/80 border-border"
            }`}
          >
            {item.label}
          </div>
        </Html>
      ))}

      {/* ---- FACE ANGLE ARCS ---- */}
      {faceArcGeo && (
        <lineSegments geometry={faceArcGeo}>
          <lineBasicMaterial color="#f59e0b" opacity={0.9} transparent />
        </lineSegments>
      )}

      {/* ---- FACE ANGLE LABELS ---- */}
      {faceAngleItems.labels.map((item) => (
        <Html
          key={item.key}
          position={[item.pos.x, item.pos.y, 1.5]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[20, 10]}
        >
          <div className="px-1 py-0.5 rounded bg-amber-500/90 text-white text-[9px] font-mono whitespace-nowrap border border-amber-400 select-none">
            {item.deg.toFixed(1)}°
          </div>
        </Html>
      ))}

      {/* ---- VERTEX ANGLE ARCS ---- */}
      {vertexArcGeo && (
        <lineSegments geometry={vertexArcGeo}>
          <lineBasicMaterial color="#a855f7" opacity={0.9} transparent />
        </lineSegments>
      )}

      {/* ---- VERTEX ANGLE LABELS ---- */}
      {vertexAngleItems.labels.map((item) => (
        <Html
          key={item.key}
          position={[item.pos.x, item.pos.y, 1.5]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[20, 10]}
        >
          <div className="px-1 py-0.5 rounded bg-purple-500/90 text-white text-[9px] font-mono whitespace-nowrap border border-purple-400 select-none">
            {item.deg.toFixed(1)}°
          </div>
        </Html>
      ))}
    </group>
  );
}
