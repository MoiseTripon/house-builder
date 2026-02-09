"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import {
  useEditorStore,
  DragState,
} from "@/features/editor/model/editor.store";
import { screenToPlan } from "./pointerToPlan";
import { pickAtPosition } from "./picking";
import { computeSnap, SnapResult } from "@/domain/geometry/snap";
import {
  Vec2,
  distance,
  closestPointOnSegment,
  distanceToSegment,
  add,
  sub,
} from "@/domain/geometry/vec2";
import {
  singleSelection,
  toggleInSelection,
} from "@/features/editor/model/selection.types";
import { findVertexNear, edgeExists } from "@/domain/plan/types";

const VERTEX_DEDUP_RADIUS = 80;

function getStore() {
  return useEditorStore.getState();
}

/* ------------------------------------------------------------------ */
/*  Snap helpers                                                       */
/* ------------------------------------------------------------------ */
function buildSnapCandidates(excludeVertexIds?: string[]) {
  const { plan } = getStore();
  const excluded = new Set(excludeVertexIds ?? []);
  const vertices = Object.values(plan.vertices)
    .filter((v) => !excluded.has(v.id))
    .map((v) => ({ id: v.id, position: v.position }));
  const edges = Object.values(plan.edges).map((e) => ({
    id: e.id,
    start: plan.vertices[e.startId]?.position ?? { x: 0, y: 0 },
    end: plan.vertices[e.endId]?.position ?? { x: 0, y: 0 },
  }));
  return { vertices, edges };
}

/* ------------------------------------------------------------------ */
/*  resolveVertex — reuse or create                                    */
/* ------------------------------------------------------------------ */
function resolveVertex(
  snappedPos: Vec2,
  snapResult: SnapResult,
): string | null {
  const s = getStore();
  const { plan } = s;

  if (snapResult.snapType === "vertex" && snapResult.snapTargetId) {
    const v = plan.vertices[snapResult.snapTargetId];
    if (v) return v.id;
  }

  const existing = findVertexNear(plan, snappedPos, VERTEX_DEDUP_RADIUS);
  if (existing) return existing.id;

  s.executeCommand({ type: "ADD_VERTEX", position: snappedPos });
  const created = findVertexNear(getStore().plan, snappedPos, 10);
  return created?.id ?? null;
}

/* ------------------------------------------------------------------ */
/*  DRAW MODE                                                          */
/* ------------------------------------------------------------------ */
function handleDrawClick(snappedPos: Vec2, snapResult: SnapResult) {
  const s = getStore();
  const { drawState } = s;

  const vertexId = resolveVertex(snappedPos, snapResult);
  if (!vertexId) return;

  if (drawState.vertexIds.length === 0) {
    getStore().setDrawState({ vertexIds: [vertexId] });
    return;
  }

  const lastVertexId = drawState.vertexIds[drawState.vertexIds.length - 1];
  if (vertexId === lastVertexId) return;

  if (edgeExists(getStore().plan, lastVertexId, vertexId)) {
    getStore().resetDrawState();
    getStore().setMode("select");
    return;
  }

  const faceCountBefore = Object.keys(getStore().plan.faces).length;

  getStore().executeCommand({
    type: "ADD_EDGE",
    startId: lastVertexId,
    endId: vertexId,
  });

  const faceCountAfter = Object.keys(getStore().plan.faces).length;

  if (
    faceCountAfter > faceCountBefore ||
    drawState.vertexIds.includes(vertexId)
  ) {
    getStore().resetDrawState();
    getStore().setMode("select");
    return;
  }

  getStore().setDrawState({ vertexIds: [...drawState.vertexIds, vertexId] });
}

/* ------------------------------------------------------------------ */
/*  SPLIT MODE                                                         */
/* ------------------------------------------------------------------ */
function handleSplitClick(pos: Vec2) {
  const s = getStore();
  const { plan } = s;
  const hitRadius = 200 / Math.max(s.camera.zoom, 0.1);

  let bestEdgeId: string | null = null;
  let bestDist = Infinity;
  let bestPoint: Vec2 | null = null;

  for (const edge of Object.values(plan.edges)) {
    const start = plan.vertices[edge.startId];
    const end = plan.vertices[edge.endId];
    if (!start || !end) continue;
    const { point, t } = closestPointOnSegment(
      pos,
      start.position,
      end.position,
    );
    const d = distance(pos, point);
    if (d < hitRadius && t > 0.05 && t < 0.95 && d < bestDist) {
      bestDist = d;
      bestEdgeId = edge.id;
      bestPoint = point;
    }
  }

  if (!bestEdgeId || !bestPoint) return;
  const edge = plan.edges[bestEdgeId];
  if (!edge) return;

  if (findVertexNear(plan, bestPoint, VERTEX_DEDUP_RADIUS)) return;

  s.executeCommand({
    type: "BATCH",
    label: "Split Edge",
    commands: [{ type: "ADD_VERTEX", position: bestPoint }],
  });

  const newVertex = findVertexNear(getStore().plan, bestPoint, 10);
  if (!newVertex) return;

  getStore().executeCommand({
    type: "BATCH",
    label: "Reconnect Split",
    commands: [
      { type: "REMOVE_EDGE", edgeId: bestEdgeId },
      { type: "ADD_EDGE", startId: edge.startId, endId: newVertex.id },
      { type: "ADD_EDGE", startId: newVertex.id, endId: edge.endId },
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Build drag state for a given hit                                   */
/* ------------------------------------------------------------------ */
function buildDragState(
  hitType: "vertex" | "edge" | "face",
  hitId: string,
  clickPos: Vec2,
): DragState | null {
  const { plan } = getStore();

  let vertexIds: string[] = [];
  let entityId = hitId;

  if (hitType === "vertex") {
    const v = plan.vertices[hitId];
    if (!v) return null;
    vertexIds = [hitId];
  } else if (hitType === "edge") {
    const edge = plan.edges[hitId];
    if (!edge) return null;
    vertexIds = [edge.startId, edge.endId];
  } else if (hitType === "face") {
    const face = plan.faces[hitId];
    if (!face) return null;
    vertexIds = [...face.vertexIds];
  }

  // Deduplicate
  vertexIds = [...new Set(vertexIds)];

  // Build start positions
  const startPositions: Record<string, Vec2> = {};
  for (const vid of vertexIds) {
    const v = plan.vertices[vid];
    if (v) startPositions[vid] = { x: v.position.x, y: v.position.y };
  }

  // Find anchor: closest vertex to click point
  let anchorVertexId = vertexIds[0];
  let anchorDist = Infinity;
  for (const vid of vertexIds) {
    const d = distance(clickPos, startPositions[vid]);
    if (d < anchorDist) {
      anchorDist = d;
      anchorVertexId = vid;
    }
  }

  return {
    type: hitType,
    entityId,
    vertexIds,
    startPositions,
    anchorVertexId,
    dragOrigin: { x: clickPos.x, y: clickPos.y },
  };
}

/* ================================================================== */
/*  COMPONENT                                                          */
/* ================================================================== */

export function CanvasInteraction() {
  const { camera, gl, size } = useThree();
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const activeDrag = useRef<DragState | null>(null);

  const getPlanPos = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const rect = gl.domElement.getBoundingClientRect();
      return screenToPlan(
        clientX - rect.left,
        clientY - rect.top,
        camera,
        size.width,
        size.height,
      );
    },
    [camera, gl, size],
  );

  /* =================================================================
     POINTER DOWN
     ================================================================= */
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      hasMoved.current = false;

      const s = getStore();
      const { mode, plan, snapConfig } = s;
      const rawPos = getPlanPos(e.clientX, e.clientY);
      const { vertices: snapV, edges: snapE } = buildSnapCandidates();

      let anchor: Vec2 | undefined;
      if (mode === "draw" && s.drawState.vertexIds.length > 0) {
        const lastId = s.drawState.vertexIds[s.drawState.vertexIds.length - 1];
        anchor = plan.vertices[lastId]?.position;
      }

      const snapResult = computeSnap(
        rawPos,
        snapConfig,
        snapV,
        snapE,
        anchor,
        s.camera.zoom,
      );
      const pos = snapResult.position;

      if (mode === "draw") {
        handleDrawClick(pos, snapResult);
        return;
      }
      if (mode === "split") {
        handleSplitClick(pos);
        return;
      }

      /* ---------- SELECT ---------- */
      const hitRadius = 150 / Math.max(s.camera.zoom, 0.1);
      const edgeHitRadius = 100 / Math.max(s.camera.zoom, 0.1);
      const hit = pickAtPosition(pos, plan, hitRadius, edgeHitRadius);

      if (hit) {
        if (e.shiftKey) {
          s.setSelection(toggleInSelection(s.selection, hit.type, hit.id));
        } else {
          s.setSelection(singleSelection(hit.type, hit.id));
        }

        // Start drag for vertex, edge, or face
        const drag = buildDragState(hit.type, hit.id, pos);
        if (drag) {
          isDragging.current = true;
          activeDrag.current = drag;
          s.setDragState(drag);
        }
      } else if (!e.shiftKey) {
        s.clearSelection();
      }
    },
    [getPlanPos],
  );

  /* =================================================================
     POINTER MOVE
     ================================================================= */
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const s = getStore();
      const { mode, plan, snapConfig, drawState } = s;
      const rawPos = getPlanPos(e.clientX, e.clientY);

      /* ---------- DRAW preview ---------- */
      if (mode === "draw" && drawState.vertexIds.length > 0) {
        const lastId = drawState.vertexIds[drawState.vertexIds.length - 1];
        const anchorV = plan.vertices[lastId]?.position;
        const { vertices: snapV, edges: snapE } = buildSnapCandidates([lastId]);
        const snapResult = computeSnap(
          rawPos,
          snapConfig,
          snapV,
          snapE,
          anchorV,
          s.camera.zoom,
        );

        let isClosing = false;
        if (drawState.vertexIds.length >= 2) {
          if (snapResult.snapType === "vertex" && snapResult.snapTargetId) {
            isClosing = drawState.vertexIds
              .slice(0, -1)
              .includes(snapResult.snapTargetId);
          }
          if (!isClosing) {
            const nearV = findVertexNear(
              plan,
              snapResult.position,
              VERTEX_DEDUP_RADIUS,
            );
            if (nearV && drawState.vertexIds.slice(0, -1).includes(nearV.id)) {
              isClosing = true;
            }
          }
        }

        s.setDrawState({ previewPosition: snapResult.position, isClosing });
        s.setGuideLines(snapResult.guideLines ?? []);
        return;
      }

      /* ---------- DRAG ---------- */
      if (isDragging.current && activeDrag.current) {
        hasMoved.current = true;
        const drag = activeDrag.current;

        // Exclude all dragged vertices from snap candidates
        const { vertices: snapV, edges: snapE } = buildSnapCandidates(
          drag.vertexIds,
        );

        // Compute where the anchor vertex would go
        const rawOffset = sub(rawPos, drag.dragOrigin);
        const anchorTarget: Vec2 = add(
          drag.startPositions[drag.anchorVertexId],
          rawOffset,
        );

        // Snap the anchor vertex target
        const snapResult = computeSnap(
          anchorTarget,
          snapConfig,
          snapV,
          snapE,
          undefined,
          s.camera.zoom,
        );
        s.setGuideLines(snapResult.guideLines ?? []);

        // Compute final offset from snapped anchor
        const finalOffset = sub(
          snapResult.position,
          drag.startPositions[drag.anchorVertexId],
        );

        // Apply offset to all dragged vertices
        const updatedVertices = { ...plan.vertices };
        for (const vid of drag.vertexIds) {
          const startP = drag.startPositions[vid];
          if (startP && updatedVertices[vid]) {
            updatedVertices[vid] = {
              ...updatedVertices[vid],
              position: add(startP, finalOffset),
            };
          }
        }
        s.updatePlanDirect({ ...plan, vertices: updatedVertices });
        return;
      }

      /* ---------- HOVER ---------- */
      if (mode === "select") {
        const hitRadius = 150 / Math.max(s.camera.zoom, 0.1);
        const edgeHitRadius = 100 / Math.max(s.camera.zoom, 0.1);
        const hit = pickAtPosition(rawPos, plan, hitRadius, edgeHitRadius);
        s.setHoveredItem(hit ? { type: hit.type, id: hit.id } : null);
      }

      if (mode === "split") {
        const hitRadius = 200 / Math.max(s.camera.zoom, 0.1);
        let found = false;
        for (const edge of Object.values(plan.edges)) {
          const start = plan.vertices[edge.startId];
          const end = plan.vertices[edge.endId];
          if (!start || !end) continue;
          if (
            distanceToSegment(rawPos, start.position, end.position) < hitRadius
          ) {
            s.setHoveredItem({ type: "edge", id: edge.id });
            found = true;
            break;
          }
        }
        if (!found) s.setHoveredItem(null);
      }
    },
    [getPlanPos],
  );

  /* =================================================================
     POINTER UP
     ================================================================= */
  const handlePointerUp = useCallback(() => {
    if (!isDragging.current || !activeDrag.current) {
      isDragging.current = false;
      activeDrag.current = null;
      return;
    }

    const s = getStore();
    const drag = activeDrag.current;

    if (hasMoved.current) {
      // Collect final positions
      const finalPositions: Record<string, Vec2> = {};
      for (const vid of drag.vertexIds) {
        const v = s.plan.vertices[vid];
        if (v) finalPositions[vid] = { ...v.position };
      }

      // Restore originals
      const restored = { ...s.plan.vertices };
      for (const vid of drag.vertexIds) {
        if (drag.startPositions[vid] && restored[vid]) {
          restored[vid] = {
            ...restored[vid],
            position: drag.startPositions[vid],
          };
        }
      }
      s.updatePlanDirect({ ...s.plan, vertices: restored });

      // Build batch command
      const moveCommands = drag.vertexIds
        .filter((vid) => {
          const sp = drag.startPositions[vid];
          const fp = finalPositions[vid];
          return sp && fp && distance(sp, fp) > 0.1;
        })
        .map((vid) => ({
          type: "MOVE_VERTEX" as const,
          vertexId: vid,
          from: drag.startPositions[vid],
          to: finalPositions[vid],
        }));

      if (moveCommands.length > 0) {
        s.executeCommand({
          type: "BATCH",
          label: `Move ${drag.type}`,
          commands: moveCommands,
        });
      }
    }

    s.setDragState(null);
    s.setGuideLines([]);
    isDragging.current = false;
    activeDrag.current = null;
    hasMoved.current = false;
  }, []);

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerup", handlePointerUp);
    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl, handlePointerDown, handlePointerMove, handlePointerUp]);

  return null;
}
