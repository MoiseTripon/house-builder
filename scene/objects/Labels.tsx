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
  add,
  scale,
} from "@/domain/geometry/vec2";
import { formatLength } from "@/domain/units/units";
import {
  getSelectedIds,
  isSelected,
} from "@/features/editor/model/selection.types";
import {
  polygonSignedArea,
  interiorAngleAt,
  interiorArcPoints,
  polygonCentroid,
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
     EDGE LENGTH LABELS — shown on ALL edges always
     ================================================================ */
  const edgeLabels = useMemo(() => {
    return Object.values(plan.edges)
      .map((edge) => {
        const start = plan.vertices[edge.startId];
        const end = plan.vertices[edge.endId];
        if (!start || !end) return null;

        const len = distance(start.position, end.position);
        if (len < 1) return null;
        const mid = midpoint(start.position, end.position);
        const label = formatLength(len, unitConfig);

        // Offset the label perpendicular to the edge so it doesn't sit on the line
        const dir = sub(end.position, start.position);
        const perp = normalize({ x: -dir.y, y: dir.x });
        const offset = scale(perp, 120);
        const labelPos = add(mid, offset);

        const isSel = isSelected(selection, "edge", edge.id);

        return { id: edge.id, pos: labelPos, label, isSel };
      })
      .filter(Boolean) as {
      id: string;
      pos: Vec2;
      label: string;
      isSel: boolean;
    }[];
  }, [plan, unitConfig, selection]);

  /* ================================================================
     ANGLE DATA for selected face(s)
     ================================================================ */
  const faceAngleData = useMemo(() => {
    if (selectedFaceIds.length === 0) return [];

    const result: {
      faceId: string;
      angles: {
        vertexId: string;
        position: Vec2;
        angleDeg: number;
        arcPoints: Vec2[];
        labelPos: Vec2;
      }[];
    }[] = [];

    for (const faceId of selectedFaceIds) {
      const face = plan.faces[faceId];
      if (!face || face.vertexIds.length < 3) continue;

      const positions = face.vertexIds
        .map((vid) => plan.vertices[vid]?.position)
        .filter(Boolean) as Vec2[];
      if (positions.length < 3) continue;

      const isCCW = polygonSignedArea(positions) > 0;
      const centroid = polygonCentroid(positions);
      const n = positions.length;
      const angles: (typeof result)[0]["angles"] = [];

      for (let i = 0; i < n; i++) {
        const curr = positions[i];
        const prev = positions[(i - 1 + n) % n];
        const next = positions[(i + 1) % n];
        const angleRad = interiorAngleAt(positions, i);
        const angleDeg = radToDeg(angleRad);

        // Arc for visualisation
        const arcRadius = Math.min(
          200,
          distance(curr, prev) * 0.25,
          distance(curr, next) * 0.25,
        );
        const arcPts = interiorArcPoints(
          curr,
          prev,
          next,
          isCCW,
          arcRadius,
          24,
        );

        // Label position: offset from vertex toward centroid
        const toCenter = sub(centroid, curr);
        const toCenterLen = distance(centroid, curr);
        const labelOffset =
          toCenterLen > 1
            ? scale(normalize(toCenter), Math.min(350, toCenterLen * 0.3))
            : { x: 0, y: 0 };
        const labelPos = add(curr, labelOffset);

        angles.push({
          vertexId: face.vertexIds[i],
          position: curr,
          angleDeg,
          arcPoints: arcPts,
          labelPos,
        });
      }

      result.push({ faceId, angles });
    }

    return result;
  }, [plan, selectedFaceIds]);

  /* ================================================================
     ANGLE DATA for selected vertex(es) — angles from containing faces
     ================================================================ */
  const vertexAngleData = useMemo(() => {
    if (selectedVertexIds.length === 0) return [];
    // Don't double-render if a face is also selected
    if (selectedFaceIds.length > 0) return [];

    const result: {
      vertexId: string;
      faceAngles: {
        faceId: string;
        angleDeg: number;
        arcPoints: Vec2[];
        labelPos: Vec2;
      }[];
    }[] = [];

    for (const vertexId of selectedVertexIds) {
      const vertex = plan.vertices[vertexId];
      if (!vertex) continue;

      const containingFaces = Object.values(plan.faces).filter((f) =>
        f.vertexIds.includes(vertexId),
      );

      const faceAngles: (typeof result)[0]["faceAngles"] = [];

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
          distance(curr, prev) * 0.25,
          distance(curr, next) * 0.25,
        );
        const arcPts = interiorArcPoints(
          curr,
          prev,
          next,
          isCCW,
          arcRadius,
          24,
        );

        const centroid = polygonCentroid(positions);
        const toCenter = sub(centroid, curr);
        const toCenterLen = distance(centroid, curr);
        const labelOffset =
          toCenterLen > 1
            ? scale(normalize(toCenter), Math.min(350, toCenterLen * 0.3))
            : { x: 0, y: 0 };
        const labelPos = add(curr, labelOffset);

        faceAngles.push({
          faceId: face.id,
          angleDeg,
          arcPoints: arcPts,
          labelPos,
        });
      }

      if (faceAngles.length > 0) {
        result.push({ vertexId, faceAngles });
      }
    }

    return result;
  }, [plan, selectedVertexIds, selectedFaceIds]);

  /* ================================================================
     ARC GEOMETRIES for selected face
     ================================================================ */
  const faceArcGeometries = useMemo(() => {
    const geos: { geometry: THREE.BufferGeometry; key: string }[] = [];
    for (const fd of faceAngleData) {
      for (const a of fd.angles) {
        if (a.arcPoints.length < 2) continue;
        const pts: number[] = [];
        for (const p of a.arcPoints) {
          pts.push(p.x, p.y, 0.6);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        geos.push({ geometry: geo, key: `${fd.faceId}_${a.vertexId}` });
      }
    }
    return geos;
  }, [faceAngleData]);

  /* ================================================================
     ARC GEOMETRIES for selected vertex
     ================================================================ */
  const vertexArcGeometries = useMemo(() => {
    const geos: { geometry: THREE.BufferGeometry; key: string }[] = [];
    for (const vd of vertexAngleData) {
      for (const fa of vd.faceAngles) {
        if (fa.arcPoints.length < 2) continue;
        const pts: number[] = [];
        for (const p of fa.arcPoints) {
          pts.push(p.x, p.y, 0.6);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        geos.push({ geometry: geo, key: `${vd.vertexId}_${fa.faceId}` });
      }
    }
    return geos;
  }, [vertexAngleData]);

  return (
    <group>
      {/* ---- EDGE LENGTH LABELS ---- */}
      {edgeLabels.map((item) => (
        <Html
          key={item.id}
          position={[item.pos.x, item.pos.y, 1]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border ${
              item.isSel
                ? "bg-blue-500/90 text-white border-blue-400"
                : "bg-background/80 backdrop-blur-sm text-foreground border-border"
            }`}
          >
            {item.label}
          </div>
        </Html>
      ))}

      {/* ---- FACE ANGLE ARCS ---- */}
      {faceArcGeometries.map((item) => (
        <line key={item.key} geometry={item.geometry}>
          <lineBasicMaterial
            color="#f59e0b"
            linewidth={1}
            opacity={0.9}
            transparent
          />
        </line>
      ))}

      {/* ---- FACE ANGLE LABELS ---- */}
      {faceAngleData.flatMap((fd) =>
        fd.angles.map((a) => (
          <Html
            key={`angle_${fd.faceId}_${a.vertexId}`}
            position={[a.labelPos.x, a.labelPos.y, 1.5]}
            center
            style={{ pointerEvents: "none" }}
          >
            <div className="px-1 py-0.5 rounded bg-amber-500/90 text-white text-[9px] font-mono whitespace-nowrap border border-amber-400">
              {a.angleDeg.toFixed(1)}°
            </div>
          </Html>
        )),
      )}

      {/* ---- VERTEX ANGLE ARCS ---- */}
      {vertexArcGeometries.map((item) => (
        <line key={item.key} geometry={item.geometry}>
          <lineBasicMaterial
            color="#a855f7"
            linewidth={1}
            opacity={0.9}
            transparent
          />
        </line>
      ))}

      {/* ---- VERTEX ANGLE LABELS ---- */}
      {vertexAngleData.flatMap((vd) =>
        vd.faceAngles.map((fa) => (
          <Html
            key={`vangle_${vd.vertexId}_${fa.faceId}`}
            position={[fa.labelPos.x, fa.labelPos.y, 1.5]}
            center
            style={{ pointerEvents: "none" }}
          >
            <div className="px-1 py-0.5 rounded bg-purple-500/90 text-white text-[9px] font-mono whitespace-nowrap border border-purple-400">
              {fa.angleDeg.toFixed(1)}°
            </div>
          </Html>
        )),
      )}
    </group>
  );
}
