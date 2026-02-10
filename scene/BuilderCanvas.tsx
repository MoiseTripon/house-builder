"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Canvas } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import { Grid } from "./objects/Grid";
import { PlanLines } from "./objects/PlanLines";
import { Highlights } from "./objects/Highlights";
import { AngleArcs } from "./objects/Labels";
import { CanvasInteraction } from "./interaction/CanvasInteraction";
import { useEditorStore } from "@/features/editor/model/editor.store";
import {
  getSelectedIds,
  isSelected,
} from "@/features/editor/model/selection.types";
import {
  Vec2,
  distance,
  midpoint,
  sub,
  normalize,
  perpCCW,
} from "@/domain/geometry/vec2";
import { formatLength } from "@/domain/units/units";
import {
  polygonSignedArea,
  interiorAngleAt,
  angleLabelPosition,
} from "@/domain/geometry/polygon";
import { WallSolids } from "./objects/WallSolids";

/* ================================================================
   Projection helper: world position → screen pixel
   For R3F orthographic camera:
     screenX = (worldX − camX) × threeZoom + width/2
     screenY = −(worldY − camY) × threeZoom + height/2
   Store zoom = threeZoom × 10, so threeZoom = storeZoom × 0.1
   ================================================================ */

function useProject(w: number, h: number) {
  const cam = useEditorStore((s) => s.camera);
  return useCallback(
    (wx: number, wy: number) => {
      const z = cam.zoom * 0.1;
      return {
        x: (wx - cam.x) * z + w / 2,
        y: -(wy - cam.y) * z + h / 2,
      };
    },
    [cam.x, cam.y, cam.zoom, w, h],
  );
}

function radToDeg(r: number) {
  return (r * 180) / Math.PI;
}

/* ================================================================
   HTML overlay for all text labels (edge lengths + angle values)
   ================================================================ */

function LabelsOverlay({ width, height }: { width: number; height: number }) {
  const plan = useEditorStore((s) => s.plan);
  const selection = useEditorStore((s) => s.selection);
  const unitConfig = useEditorStore((s) => s.unitConfig);
  const project = useProject(width, height);

  const selectedFaceIds = getSelectedIds(selection, "face");
  const selectedVertexIds = getSelectedIds(selection, "vertex");

  const edgesInFaces = useMemo(() => {
    const set = new Set<string>();
    for (const face of Object.values(plan.faces)) {
      for (const eid of face.edgeIds) set.add(eid);
    }
    return set;
  }, [plan.faces]);

  /* ---- Edge length labels ---- */
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
        const worldPos: Vec2 = {
          x: mid.x + perp.x * 120,
          y: mid.y + perp.y * 120,
        };
        const screen = project(worldPos.x, worldPos.y);

        const isSel = isSelected(selection, "edge", edge.id);
        const isOrphan = !edgesInFaces.has(edge.id);

        return {
          id: edge.id,
          screen,
          label: formatLength(len, unitConfig),
          isSel,
          isOrphan,
        };
      })
      .filter(Boolean) as {
      id: string;
      screen: { x: number; y: number };
      label: string;
      isSel: boolean;
      isOrphan: boolean;
    }[];
  }, [plan, unitConfig, selection, edgesInFaces, project]);

  /* ---- Face angle labels ---- */
  const faceAngleLabels = useMemo(() => {
    if (selectedFaceIds.length === 0) return [];
    const result: {
      key: string;
      screen: { x: number; y: number };
      deg: number;
    }[] = [];

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

        const angleDeg = radToDeg(interiorAngleAt(positions, i));

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
        const screen = project(lp.x, lp.y);

        result.push({
          key: `fa_${faceId}_${face.vertexIds[i]}`,
          screen,
          deg: angleDeg,
        });
      }
    }
    return result;
  }, [plan, selectedFaceIds, project]);

  /* ---- Vertex angle labels (from containing faces, skip if face selected) ---- */
  const vertexAngleLabels = useMemo(() => {
    if (selectedVertexIds.length === 0 || selectedFaceIds.length > 0) return [];
    const result: {
      key: string;
      screen: { x: number; y: number };
      deg: number;
    }[] = [];

    for (const vid of selectedVertexIds) {
      const v = plan.vertices[vid];
      if (!v) continue;

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

        const angleDeg = radToDeg(interiorAngleAt(positions, idx));
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
        const screen = project(lp.x, lp.y);

        result.push({ key: `va_${vid}_${face.id}`, screen, deg: angleDeg });
      }
    }
    return result;
  }, [plan, selectedVertexIds, selectedFaceIds, project]);

  const pad = 200;
  const isVisible = (s: { x: number; y: number }) =>
    s.x > -pad && s.x < width + pad && s.y > -pad && s.y < height + pad;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 10 }}
    >
      {/* Edge lengths */}
      {edgeLabels.map(
        (item) =>
          isVisible(item.screen) && (
            <div
              key={`el_${item.id}`}
              className={`absolute px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border ${
                item.isSel
                  ? "bg-blue-500/90 text-white border-blue-400"
                  : item.isOrphan
                    ? "bg-orange-500/80 text-white border-orange-400"
                    : "bg-background/80 backdrop-blur-sm text-foreground/80 border-border"
              }`}
              style={{
                left: item.screen.x,
                top: item.screen.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              {item.label}
            </div>
          ),
      )}

      {/* Face angle labels */}
      {faceAngleLabels.map(
        (item) =>
          isVisible(item.screen) && (
            <div
              key={item.key}
              className="absolute px-1 py-0.5 rounded bg-amber-500/90 text-white text-[9px] font-mono whitespace-nowrap border border-amber-400"
              style={{
                left: item.screen.x,
                top: item.screen.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              {item.deg.toFixed(1)}°
            </div>
          ),
      )}

      {/* Vertex angle labels */}
      {vertexAngleLabels.map(
        (item) =>
          isVisible(item.screen) && (
            <div
              key={item.key}
              className="absolute px-1 py-0.5 rounded bg-purple-500/90 text-white text-[9px] font-mono whitespace-nowrap border border-purple-400"
              style={{
                left: item.screen.x,
                top: item.screen.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              {item.deg.toFixed(1)}°
            </div>
          ),
      )}
    </div>
  );
}

/* ================================================================
   MAIN CANVAS
   ================================================================ */

export function BuilderCanvas() {
  const camera = useEditorStore((s) => s.camera);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Canvas
        orthographic
        camera={{
          position: [camera.x, camera.y, 100],
          zoom: camera.zoom * 0.1,
          near: 0.1,
          far: 1000,
          up: [0, 0, 1],
        }}
        style={{ background: "#0a0a0f" }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={1} />
        <Grid />
        <PlanLines />
        <WallSolids />
        <Highlights />
        <AngleArcs />
        <CanvasInteraction />
        <MapControls
          enableRotate={false}
          enableDamping={false}
          screenSpacePanning
          zoomSpeed={1.2}
          onChange={(e) => {
            if (e?.target) {
              const cam = (e.target as any).object;
              useEditorStore.getState().setCamera({
                x: cam.position.x,
                y: cam.position.y,
                zoom: cam.zoom * 10,
              });
            }
          }}
        />
      </Canvas>
      <LabelsOverlay
        width={containerSize.width}
        height={containerSize.height}
      />
    </div>
  );
}
