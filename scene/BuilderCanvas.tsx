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
import {
  useEditorStore,
  CameraView,
} from "@/features/editor/model/editor.store";
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
   Camera Controller Component
   ================================================================ */

function CameraController() {
  const { camera: cam } = useThree();
  const cameraState = useEditorStore((s) => s.camera);
  const setCamera = useEditorStore((s) => s.setCamera);

  useEffect(() => {
    if (cameraState.view === "top") {
      // Orthographic top-down view
      cam.position.set(cameraState.x, cameraState.y, 100);
      cam.up.set(0, 1, 0);
      if (cam instanceof THREE.OrthographicCamera) {
        cam.zoom = cameraState.zoom * 0.1;
        cam.updateProjectionMatrix();
      }
    } else {
      // 3D perspective/angled views
      const distance = 10000 / Math.max(cameraState.zoom, 0.1);
      const x =
        cameraState.x +
        distance *
          Math.sin(cameraState.polarAngle) *
          Math.cos(cameraState.azimuthAngle);
      const y =
        cameraState.y +
        distance *
          Math.sin(cameraState.polarAngle) *
          Math.sin(cameraState.azimuthAngle);
      const z = distance * Math.cos(cameraState.polarAngle);

      cam.position.set(x, y, z);
      cam.up.set(0, 0, 1);
      cam.lookAt(cameraState.x, cameraState.y, 0);

      if (cam instanceof THREE.OrthographicCamera) {
        cam.zoom = cameraState.zoom * 0.1;
        cam.updateProjectionMatrix();
      }
    }
  }, [cam, cameraState]);

  return null;
}

/* ================================================================
   Projection helper: world position → screen pixel
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
  const cameraView = useEditorStore((s) => s.camera.view);
  const project = useProject(width, height);

  // Only show labels in top view
  if (cameraView !== "top") {
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

  /* ---- Vertex angle labels ---- */
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
   Camera View Switcher UI
   ================================================================ */

function CameraViewSwitcher() {
  const cameraView = useEditorStore((s) => s.camera.view);
  const setCameraView = useEditorStore((s) => s.setCameraView);

  const views: { value: CameraView; label: string; icon: string }[] = [
    { value: "top", label: "Top", icon: "⬇" },
    { value: "perspective", label: "3D", icon: "◇" },
    { value: "front", label: "Front", icon: "□" },
    { value: "side", label: "Side", icon: "▯" },
  ];

  return (
    <div className="absolute top-4 right-4 z-20 flex gap-1 bg-background/90 backdrop-blur-sm rounded-lg p-1 border border-border shadow-lg">
      {views.map((v) => (
        <button
          key={v.value}
          onClick={() => setCameraView(v.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            cameraView === v.value
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          }`}
          title={v.label}
        >
          <span className="mr-1">{v.icon}</span>
          {v.label}
        </button>
      ))}
    </div>
  );
}

/* ================================================================
   MAIN CANVAS
   ================================================================ */

export function BuilderCanvas() {
  const camera = useEditorStore((s) => s.camera);
  const setCamera = useEditorStore((s) => s.setCamera);
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

  // Calculate camera position based on view
  const cameraPosition = useMemo((): [number, number, number] => {
    if (camera.view === "top") {
      return [camera.x, camera.y, 100];
    }

    const dist = 10000 / Math.max(camera.zoom, 0.1);
    const x =
      camera.x +
      dist * Math.sin(camera.polarAngle) * Math.cos(camera.azimuthAngle);
    const y =
      camera.y +
      dist * Math.sin(camera.polarAngle) * Math.sin(camera.azimuthAngle);
    const z = dist * Math.cos(camera.polarAngle);

    return [x, y, Math.max(z, 100)];
  }, [camera]);

  const isTopView = camera.view === "top";

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Canvas
        orthographic
        camera={{
          position: cameraPosition,
          zoom: camera.zoom * 0.1,
          near: 0.1,
          far: 100000,
          up: isTopView ? [0, 1, 0] : [0, 0, 1],
        }}
        style={{ background: "#0a0a0f" }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5000, 5000, 10000]} intensity={0.8} />
        <directionalLight position={[-3000, -3000, 5000]} intensity={0.3} />

        <CameraController />
        <Grid />
        <PlanLines />
        <WallSolids />
        <Highlights />
        <AngleArcs />

        {/* Only enable interaction in top view */}
        {isTopView && <CanvasInteraction />}

        {isTopView ? (
          <MapControls
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
        ) : (
          <OrbitControls
            enableDamping={false}
            enablePan={true}
            enableZoom={true}
            zoomSpeed={1.2}
            target={[camera.x, camera.y, 0]}
            onChange={(e) => {
              if (e?.target) {
                const controls = e.target as any;
                const cam = controls.object;

                // Update zoom from camera
                setCamera({
                  zoom: cam.zoom * 10,
                  // Calculate angles from camera position relative to target
                  polarAngle: Math.acos(
                    Math.max(
                      -1,
                      Math.min(
                        1,
                        (cam.position.z - 0) /
                          cam.position.distanceTo(
                            new THREE.Vector3(camera.x, camera.y, 0),
                          ),
                      ),
                    ),
                  ),
                  azimuthAngle: Math.atan2(
                    cam.position.y - camera.y,
                    cam.position.x - camera.x,
                  ),
                });
              }
            }}
          />
        )}
      </Canvas>

      <CameraViewSwitcher />

      {isTopView && (
        <LabelsOverlay
          width={containerSize.width}
          height={containerSize.height}
        />
      )}
    </div>
  );
}
