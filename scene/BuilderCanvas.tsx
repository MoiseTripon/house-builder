"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, MapControls } from "@react-three/drei";
import * as THREE from "three";
import { Grid } from "./objects/Grid";
import { PlanLines } from "./objects/PlanLines";
import { WallSolids } from "./objects/WallSolids";
import { Highlights } from "./objects/Highlights";
import { AngleArcs } from "./objects/Labels";
import { CanvasInteraction } from "./interaction/CanvasInteraction";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { useWallsStore } from "@/features/walls/model/walls.store";
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

/* ================================================================
   Plan View Camera Setup - ensures proper top-down view
   ================================================================ */
function PlanViewCamera() {
  const { camera, gl } = useThree();
  const cameraState = useEditorStore((s) => s.camera);
  const setCamera = useEditorStore((s) => s.setCamera);
  const controlsRef = useRef<any>(null);

  // Initial setup for plan view
  useEffect(() => {
    camera.position.set(cameraState.x, cameraState.y, 1000);
    camera.up.set(0, 1, 0);
    camera.lookAt(cameraState.x, cameraState.y, 0);

    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = cameraState.zoom * 0.1;
      camera.updateProjectionMatrix();
    }
  }, []);

  return (
    <MapControls
      ref={controlsRef}
      enableRotate={false}
      enableDamping={false}
      screenSpacePanning
      zoomSpeed={1.2}
      onChange={(e) => {
        if (e?.target) {
          const cam = (e.target as any).object;
          setCamera({
            x: cam.position.x,
            y: cam.position.y,
            zoom: cam.zoom * 10,
          });
        }
      }}
    />
  );
}

/* ================================================================
   3D View Camera Setup
   ================================================================ */
function ThreeDViewCamera() {
  const { camera } = useThree();
  const cameraState = useEditorStore((s) => s.camera);
  const setCamera = useEditorStore((s) => s.setCamera);

  // Initial setup for 3D view
  useEffect(() => {
    const dist = cameraState.distance;
    const x =
      cameraState.x +
      dist *
        Math.sin(cameraState.polarAngle) *
        Math.cos(cameraState.azimuthAngle);
    const y =
      cameraState.y +
      dist *
        Math.sin(cameraState.polarAngle) *
        Math.sin(cameraState.azimuthAngle);
    const z = dist * Math.cos(cameraState.polarAngle);

    camera.position.set(x, y, Math.max(z, 100));
    camera.up.set(0, 0, 1);
    camera.lookAt(cameraState.x, cameraState.y, 0);

    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = cameraState.zoom * 0.05;
      camera.updateProjectionMatrix();
    }
  }, []);

  return (
    <OrbitControls
      enableDamping={false}
      enablePan={true}
      enableZoom={true}
      zoomSpeed={1.2}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 - 0.1}
      target={[cameraState.x, cameraState.y, 0]}
      onChange={(e) => {
        if (e?.target) {
          const controls = e.target as any;
          const cam = controls.object;
          const target = controls.target;

          const dx = cam.position.x - target.x;
          const dy = cam.position.y - target.y;
          const dz = cam.position.z - target.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          setCamera({
            zoom: cam.zoom * 20,
            distance: dist,
            polarAngle: Math.acos(Math.max(-1, Math.min(1, dz / dist))),
            azimuthAngle: Math.atan2(dy, dx),
          });
        }
      }}
    />
  );
}

/* ================================================================
   Projection helper
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
   Labels Overlay (Plan view only)
   ================================================================ */
function LabelsOverlay({ width, height }: { width: number; height: number }) {
  const plan = useEditorStore((s) => s.plan);
  const selection = useEditorStore((s) => s.selection);
  const unitConfig = useEditorStore((s) => s.unitConfig);
  const viewMode = useEditorStore((s) => s.viewMode);
  const project = useProject(width, height);

  if (viewMode !== "plan") {
    return null;
  }

  const selectedFaceIds = getSelectedIds(selection, "face");
  const selectedVertexIds = getSelectedIds(selection, "vertex");

  const edgesInFaces = useMemo(() => {
    const set = new Set<string>();
    for (const face of Object.values(plan.faces)) {
      for (const eid of face.edgeIds) set.add(eid);
    }
    return set;
  }, [plan.faces]);

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
   Scene Content - separated to handle view mode switching
   ================================================================ */
function SceneContent({ isPlanView }: { isPlanView: boolean }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5000, 5000, 10000]} intensity={0.8} />
      <directionalLight position={[-3000, -3000, 5000]} intensity={0.3} />

      <Grid />
      <PlanLines />
      <WallSolids />
      <Highlights />
      {isPlanView && <AngleArcs />}
      {isPlanView && <CanvasInteraction />}

      {isPlanView ? <PlanViewCamera /> : <ThreeDViewCamera />}
    </>
  );
}

/* ================================================================
   MAIN CANVAS
   ================================================================ */
export function BuilderCanvas() {
  const camera = useEditorStore((s) => s.camera);
  const viewMode = useEditorStore((s) => s.viewMode);
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

  const isPlanView = viewMode === "plan";

  // Calculate initial camera position based on view
  const cameraPosition = useMemo((): [number, number, number] => {
    if (isPlanView) {
      return [camera.x, camera.y, 1000];
    }

    const dist = camera.distance;
    const x =
      camera.x +
      dist * Math.sin(camera.polarAngle) * Math.cos(camera.azimuthAngle);
    const y =
      camera.y +
      dist * Math.sin(camera.polarAngle) * Math.sin(camera.azimuthAngle);
    const z = dist * Math.cos(camera.polarAngle);

    return [x, y, Math.max(z, 100)];
  }, [camera, isPlanView]);

  // Key forces re-mount of Canvas when view mode changes
  // This ensures clean camera state
  const canvasKey = `canvas-${viewMode}`;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Canvas
        key={canvasKey}
        orthographic
        camera={{
          position: cameraPosition,
          zoom: isPlanView ? camera.zoom * 0.1 : camera.zoom * 0.05,
          near: 0.1,
          far: 100000,
          up: isPlanView ? [0, 1, 0] : [0, 0, 1],
        }}
        style={{ background: "#0a0a0f" }}
        gl={{ antialias: true }}
      >
        <SceneContent isPlanView={isPlanView} />
      </Canvas>

      {isPlanView && (
        <LabelsOverlay
          width={containerSize.width}
          height={containerSize.height}
        />
      )}
    </div>
  );
}
