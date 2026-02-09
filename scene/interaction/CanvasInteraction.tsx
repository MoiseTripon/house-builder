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
import { findEdgeAtPoint } from "@/domain/plan/mutations";

const VERTEX_DEDUP_RADIUS = 80;
const MERGE_RADIUS = 80; // distance at which dragged vertex merges

function getStore() {
  return useEditorStore.getState();
}

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
/*  resolveVertex — reuse existing, split edge, or create new         */
/*  This is the core of the integrated draw+split logic.              */
/* ------------------------------------------------------------------ */
function resolveVertex(
  snappedPos: Vec2,
  snapResult: SnapResult,
): string | null {
  const s = getStore();
  const { plan } = s;

  // 1. Snap hit an existing vertex — use it
  if (snapResult.snapType === "vertex" && snapResult.snapTargetId) {
    const v = plan.vertices[snapResult.snapTargetId];
    if (v) return v.id;
  }

  // 2. Safety dedup: existing vertex within merge radius
  const existing = findVertexNear(plan, snappedPos, VERTEX_DEDUP_RADIUS);
  if (existing) return existing.id;

  // 3. Check if we landed on an edge — split it and return the new vertex
  const edgeHitRadius = 100 / Math.max(s.camera.zoom, 0.1);
  const edgeHit = findEdgeAtPoint(plan, snappedPos, edgeHitRadius);

  if (edgeHit) {
    // Split the edge at this point
    s.executeCommand({
      type: "SPLIT_EDGE",
      edgeId: edgeHit.edgeId,
      position: edgeHit.point,
    });
    // Find the newly created vertex
    const newV = findVertexNear(getStore().plan, edgeHit.point, 10);
    if (newV) return newV.id;
  }

  // 4. Create a brand new vertex
  s.executeCommand({ type: "ADD_VERTEX", position: snappedPos });
  const created = findVertexNear(getStore().plan, snappedPos, 10);
  return created?.id ?? null;
}

/* ------------------------------------------------------------------ */
/*  DRAW MODE — click handler                                          */
/* ------------------------------------------------------------------ */
function handleDrawClick(snappedPos: Vec2, snapResult: SnapResult) {
  const s = getStore();
  const { drawState } = s;

  const vertexId = resolveVertex(snappedPos, snapResult);
  if (!vertexId) return;

  // First point
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

  // Polygon closed (new face created) or hit existing chain vertex → stop drawing
  if (
    faceCountAfter > faceCountBefore ||
    drawState.vertexIds.includes(vertexId)
  ) {
    getStore().resetDrawState();
    getStore().setMode("select");
    return;
  }

  // Continue drawing
  getStore().setDrawState({ vertexIds: [...drawState.vertexIds, vertexId] });
}

/* ------------------------------------------------------------------ */
/*  Build drag state                                                   */
/* ------------------------------------------------------------------ */
function buildDragState(
  hitType: "vertex" | "edge" | "face",
  hitId: string,
  clickPos: Vec2,
): DragState | null {
  const { plan } = getStore();

  let vertexIds: string[] = [];

  if (hitType === "vertex") {
    if (!plan.vertices[hitId]) return null;
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

  vertexIds = [...new Set(vertexIds)];

  const startPositions: Record<string, Vec2> = {};
  for (const vid of vertexIds) {
    const v = plan.vertices[vid];
    if (v) startPositions[vid] = { x: v.position.x, y: v.position.y };
  }

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
    entityId: hitId,
    vertexIds,
    startPositions,
    anchorVertexId,
    dragOrigin: { ...clickPos },
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

  /* ===== POINTER DOWN ===== */
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

      /* SELECT */
      const hitRadius = 150 / Math.max(s.camera.zoom, 0.1);
      const edgeHitRadius = 100 / Math.max(s.camera.zoom, 0.1);
      const hit = pickAtPosition(pos, plan, hitRadius, edgeHitRadius);

      if (hit) {
        if (e.shiftKey) {
          s.setSelection(toggleInSelection(s.selection, hit.type, hit.id));
        } else {
          s.setSelection(singleSelection(hit.type, hit.id));
        }

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

  /* ===== POINTER MOVE ===== */
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const s = getStore();
      const { mode, plan, snapConfig, drawState } = s;
      const rawPos = getPlanPos(e.clientX, e.clientY);

      /* DRAW preview */
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
            if (nearV && drawState.vertexIds.slice(0, -1).includes(nearV.id))
              isClosing = true;
          }
        }

        s.setDrawState({ previewPosition: snapResult.position, isClosing });
        s.setGuideLines(snapResult.guideLines ?? []);
        return;
      }

      /* DRAG */
      if (isDragging.current && activeDrag.current) {
        hasMoved.current = true;
        const drag = activeDrag.current;

        const { vertices: snapV, edges: snapE } = buildSnapCandidates(
          drag.vertexIds,
        );

        const rawOffset = sub(rawPos, drag.dragOrigin);
        const anchorTarget: Vec2 = add(
          drag.startPositions[drag.anchorVertexId],
          rawOffset,
        );

        const snapResult = computeSnap(
          anchorTarget,
          snapConfig,
          snapV,
          snapE,
          undefined,
          s.camera.zoom,
        );
        s.setGuideLines(snapResult.guideLines ?? []);

        const finalOffset = sub(
          snapResult.position,
          drag.startPositions[drag.anchorVertexId],
        );

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

      /* HOVER */
      if (mode === "select") {
        const hitRadius = 150 / Math.max(s.camera.zoom, 0.1);
        const edgeHitRadius = 100 / Math.max(s.camera.zoom, 0.1);
        const hit = pickAtPosition(rawPos, plan, hitRadius, edgeHitRadius);
        s.setHoveredItem(hit ? { type: hit.type, id: hit.id } : null);
      }
    },
    [getPlanPos],
  );

  /* ===== POINTER UP ===== */
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

      // Restore originals for history
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

      // Check for vertex merging (only for single vertex drag)
      if (drag.type === "vertex" && drag.vertexIds.length === 1) {
        const draggedVid = drag.vertexIds[0];
        const finalPos = finalPositions[draggedVid];

        if (finalPos) {
          // Look for a nearby vertex to merge with
          // We need to search after restoring original positions
          const nearbyVertex = findVertexNear(s.plan, finalPos, MERGE_RADIUS);

          if (nearbyVertex && nearbyVertex.id !== draggedVid) {
            // Move first, then merge
            s.executeCommand({
              type: "BATCH",
              label: "Move and Merge Vertices",
              commands: [
                {
                  type: "MOVE_VERTEX",
                  vertexId: draggedVid,
                  from: drag.startPositions[draggedVid],
                  to: finalPos,
                },
                {
                  type: "MERGE_VERTICES",
                  keepId: nearbyVertex.id,
                  removeId: draggedVid,
                },
              ],
            });

            s.setDragState(null);
            s.setGuideLines([]);
            s.clearSelection();
            isDragging.current = false;
            activeDrag.current = null;
            hasMoved.current = false;
            return;
          }
        }
      }

      // Normal move (no merge)
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
