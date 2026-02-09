"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { screenToPlan } from "./pointerToPlan";
import { pickAtPosition } from "./picking";
import { computeSnap, SnapResult } from "@/domain/geometry/snap";
import {
  Vec2,
  distance,
  closestPointOnSegment,
  distanceToSegment,
} from "@/domain/geometry/vec2";
import {
  singleSelection,
  toggleInSelection,
} from "@/features/editor/model/selection.types";
import { findVertexNear, edgeExists } from "@/domain/plan/types";

const VERTEX_DEDUP_RADIUS = 80; // mm — below this we reuse an existing vertex

/* ------------------------------------------------------------------ */
/*  Helper to read the *latest* store snapshot (Zustand is sync)      */
/* ------------------------------------------------------------------ */
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
/*  resolveVertex                                                      */
/*  Given a snapped position + snap result, return an existing vertex  */
/*  id or create a new vertex and return its id.  Never duplicates.    */
/* ------------------------------------------------------------------ */
function resolveVertex(
  snappedPos: Vec2,
  snapResult: SnapResult,
): string | null {
  const s = getStore();
  const { plan } = s;

  // 1. Snap system says we hit a vertex — use it directly
  if (snapResult.snapType === "vertex" && snapResult.snapTargetId) {
    const v = plan.vertices[snapResult.snapTargetId];
    if (v) return v.id;
  }

  // 2. Safety dedup: is there already a vertex within merge radius?
  const existing = findVertexNear(plan, snappedPos, VERTEX_DEDUP_RADIUS);
  if (existing) return existing.id;

  // 3. Create a new vertex via command
  s.executeCommand({ type: "ADD_VERTEX", position: snappedPos });

  // 4. Find the vertex we just created (store is already updated)
  const created = findVertexNear(getStore().plan, snappedPos, 10);
  return created?.id ?? null;
}

/* ------------------------------------------------------------------ */
/*  DRAW MODE — click handler                                          */
/* ------------------------------------------------------------------ */
function handleDrawClick(snappedPos: Vec2, snapResult: SnapResult) {
  const s = getStore();
  const { drawState, plan } = s;

  // ---- resolve which vertex we are clicking on / creating ----
  const vertexId = resolveVertex(snappedPos, snapResult);
  if (!vertexId) return;

  // ---- first point — just record it, no edge yet ----
  if (drawState.vertexIds.length === 0) {
    getStore().setDrawState({ vertexIds: [vertexId] });
    return;
  }

  const lastVertexId = drawState.vertexIds[drawState.vertexIds.length - 1];

  // Don't connect a vertex to itself
  if (vertexId === lastVertexId) return;

  // Don't create a duplicate edge
  if (edgeExists(getStore().plan, lastVertexId, vertexId)) {
    // If the target is in the draw chain it might already be closed — just exit
    getStore().resetDrawState();
    getStore().setMode("select");
    return;
  }

  // ---- count faces BEFORE adding the edge ----
  const faceCountBefore = Object.keys(getStore().plan.faces).length;

  // ---- create the edge ----
  getStore().executeCommand({
    type: "ADD_EDGE",
    startId: lastVertexId,
    endId: vertexId,
  });

  // ---- count faces AFTER ----
  const faceCountAfter = Object.keys(getStore().plan.faces).length;
  const closedPolygon = faceCountAfter > faceCountBefore;

  // ---- if a new face appeared ⇒ polygon closed ⇒ stop drawing ----
  if (closedPolygon) {
    getStore().resetDrawState();
    getStore().setMode("select");
    return;
  }

  // ---- if target vertex was already in our chain (cycle, even without
  //      face detection catching it), stop drawing ----
  if (drawState.vertexIds.includes(vertexId)) {
    getStore().resetDrawState();
    getStore().setMode("select");
    return;
  }

  // ---- otherwise continue drawing from this vertex ----
  getStore().setDrawState({
    vertexIds: [...drawState.vertexIds, vertexId],
  });
}

/* ------------------------------------------------------------------ */
/*  SPLIT MODE — click handler                                         */
/* ------------------------------------------------------------------ */
function handleSplitClick(pos: Vec2) {
  const s = getStore();
  const { plan } = s;

  let bestEdgeId: string | null = null;
  let bestDist = Infinity;
  let bestPoint: Vec2 | null = null;

  const hitRadius = 200 / Math.max(s.camera.zoom, 0.1);

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

  // Check vertex dedup at split point too
  const existingAtSplit = findVertexNear(plan, bestPoint, VERTEX_DEDUP_RADIUS);
  if (existingAtSplit) return; // too close to an existing vertex, don't split

  // Execute as batch: add vertex ➞ remove old edge ➞ add two new edges
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

/* ================================================================== */
/*  COMPONENT                                                          */
/* ================================================================== */

export function CanvasInteraction() {
  const { camera, gl, size } = useThree();
  const isDragging = useRef(false);
  const dragVertexId = useRef<string | null>(null);
  const dragStartPos = useRef<Vec2>({ x: 0, y: 0 });

  /* ---------- coordinate conversion ---------- */
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

      const s = getStore();
      const { mode, plan, snapConfig } = s;
      const rawPos = getPlanPos(e.clientX, e.clientY);

      // -- build snap candidates (exclude nothing for general snap) --
      const { vertices: snapV, edges: snapE } = buildSnapCandidates();

      // During draw we anchor angle snap to the last placed vertex
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

      /* ---------- DRAW ---------- */
      if (mode === "draw") {
        handleDrawClick(pos, snapResult);
        return;
      }

      /* ---------- SPLIT ---------- */
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

        if (hit.type === "vertex") {
          isDragging.current = true;
          dragVertexId.current = hit.id;
          dragStartPos.current = { ...plan.vertices[hit.id].position };
          s.setDragState({
            vertexId: hit.id,
            startPosition: { ...plan.vertices[hit.id].position },
            currentPosition: { ...plan.vertices[hit.id].position },
          });
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
        const anchor = plan.vertices[lastId]?.position;

        const { vertices: snapV, edges: snapE } = buildSnapCandidates([lastId]);
        const snapResult = computeSnap(
          rawPos,
          snapConfig,
          snapV,
          snapE,
          anchor,
          s.camera.zoom,
        );

        // Determine if we're about to close the polygon
        let isClosing = false;
        if (drawState.vertexIds.length >= 2) {
          // Check if snapped to ANY vertex already in the draw chain (except last)
          if (snapResult.snapType === "vertex" && snapResult.snapTargetId) {
            isClosing = drawState.vertexIds
              .slice(0, -1)
              .includes(snapResult.snapTargetId);
          }
          // Also check with findVertexNear as fallback
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

        s.setDrawState({
          previewPosition: snapResult.position,
          isClosing,
        });
        s.setGuideLines(snapResult.guideLines ?? []);
        return;
      }

      /* ---------- DRAG vertex ---------- */
      if (isDragging.current && dragVertexId.current) {
        const { vertices: snapV, edges: snapE } = buildSnapCandidates([
          dragVertexId.current,
        ]);
        const snapResult = computeSnap(
          rawPos,
          snapConfig,
          snapV,
          snapE,
          undefined,
          s.camera.zoom,
        );

        s.setGuideLines(snapResult.guideLines ?? []);

        s.updatePlanDirect({
          ...plan,
          vertices: {
            ...plan.vertices,
            [dragVertexId.current]: {
              ...plan.vertices[dragVertexId.current],
              position: snapResult.position,
            },
          },
        });

        s.setDragState({
          vertexId: dragVertexId.current,
          startPosition: dragStartPos.current,
          currentPosition: snapResult.position,
        });
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
    if (!isDragging.current || !dragVertexId.current) {
      isDragging.current = false;
      dragVertexId.current = null;
      return;
    }

    const s = getStore();
    const currentPos = s.plan.vertices[dragVertexId.current]?.position;

    if (currentPos && distance(dragStartPos.current, currentPos) > 0.1) {
      // Restore the original position first so the undo snapshot is correct
      s.updatePlanDirect({
        ...s.plan,
        vertices: {
          ...s.plan.vertices,
          [dragVertexId.current!]: {
            ...s.plan.vertices[dragVertexId.current!],
            position: dragStartPos.current,
          },
        },
      });
      s.executeCommand({
        type: "MOVE_VERTEX",
        vertexId: dragVertexId.current!,
        from: dragStartPos.current,
        to: currentPos,
      });
    }

    s.setDragState(null);
    s.setGuideLines([]);
    isDragging.current = false;
    dragVertexId.current = null;
  }, []);

  /* ---------- attach / detach ---------- */
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
