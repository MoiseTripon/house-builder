"use client";

import React, { useCallback, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { screenToPlan } from "./pointerToPlan";
import { pickAtPosition } from "./picking";
import { computeSnap } from "@/domain/geometry/snap";
import { Vec2, distance } from "@/domain/geometry/vec2";
import {
  singleSelection,
  toggleInSelection,
  emptySelection,
} from "@/features/editor/model/selection.types";
import { pointInPolygon } from "@/domain/geometry/polygon";

export function CanvasInteraction() {
  const { camera, gl, size } = useThree();
  const isDragging = useRef(false);
  const dragVertexId = useRef<string | null>(null);
  const dragStartPos = useRef<Vec2>({ x: 0, y: 0 });

  const getPlanPos = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return screenToPlan(x, y, camera, size.width, size.height);
    },
    [camera, gl, size],
  );

  const getSnapCandidates = useCallback(() => {
    const store = useEditorStore.getState();
    const { plan } = store;

    const vertices = Object.values(plan.vertices).map((v) => ({
      id: v.id,
      position: v.position,
    }));

    const edges = Object.values(plan.edges).map((e) => ({
      id: e.id,
      start: plan.vertices[e.startId]?.position ?? { x: 0, y: 0 },
      end: plan.vertices[e.endId]?.position ?? { x: 0, y: 0 },
    }));

    return { vertices, edges };
  }, []);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;

      const store = useEditorStore.getState();
      const { mode, plan, snapConfig, drawState } = store;
      const rawPos = getPlanPos(e.clientX, e.clientY);
      const { vertices, edges } = getSnapCandidates();

      const snapResult = computeSnap(
        rawPos,
        snapConfig,
        vertices,
        edges,
        undefined,
        store.camera.zoom,
      );
      const pos = snapResult.position;

      if (mode === "draw") {
        handleDrawClick(store, pos, rawPos);
        return;
      }

      if (mode === "split") {
        handleSplitClick(store, pos);
        return;
      }

      // Select mode
      const hit = pickAtPosition(
        pos,
        plan,
        150 / Math.max(store.camera.zoom, 0.1),
        100 / Math.max(store.camera.zoom, 0.1),
      );

      if (hit) {
        if (e.shiftKey) {
          store.setSelection(
            toggleInSelection(store.selection, hit.type, hit.id),
          );
        } else {
          store.setSelection(singleSelection(hit.type, hit.id));
        }

        // Start drag if vertex
        if (hit.type === "vertex") {
          isDragging.current = true;
          dragVertexId.current = hit.id;
          dragStartPos.current = { ...plan.vertices[hit.id].position };
          store.setDragState({
            vertexId: hit.id,
            startPosition: { ...plan.vertices[hit.id].position },
            currentPosition: { ...plan.vertices[hit.id].position },
          });
        }
      } else if (!e.shiftKey) {
        store.clearSelection();
      }
    },
    [getPlanPos, getSnapCandidates],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const store = useEditorStore.getState();
      const { mode, plan, snapConfig, drawState } = store;
      const rawPos = getPlanPos(e.clientX, e.clientY);
      const { vertices: snapVerts, edges: snapEdges } = getSnapCandidates();

      if (mode === "draw" && drawState.vertexIds.length > 0) {
        const lastVertexId =
          drawState.vertexIds[drawState.vertexIds.length - 1];
        const lastVertex = plan.vertices[lastVertexId];
        const anchor = lastVertex?.position;

        const filteredVerts = snapVerts.filter(
          (v) => !drawState.vertexIds.includes(v.id),
        );

        const snapResult = computeSnap(
          rawPos,
          snapConfig,
          filteredVerts,
          snapEdges,
          anchor,
          store.camera.zoom,
        );

        // Check if closing
        const firstVertexId = drawState.vertexIds[0];
        const firstVertex = plan.vertices[firstVertexId];
        const isClosing =
          drawState.vertexIds.length >= 3 &&
          firstVertex &&
          distance(snapResult.position, firstVertex.position) <
            150 / Math.max(store.camera.zoom, 0.1);

        store.setDrawState({
          previewPosition:
            isClosing && firstVertex
              ? firstVertex.position
              : snapResult.position,
          isClosing: !!isClosing,
        });
        store.setGuideLines(snapResult.guideLines ?? []);
        return;
      }

      // Dragging
      if (isDragging.current && dragVertexId.current) {
        const filteredVerts = snapVerts.filter(
          (v) => v.id !== dragVertexId.current,
        );
        const snapResult = computeSnap(
          rawPos,
          snapConfig,
          filteredVerts,
          snapEdges,
          undefined,
          store.camera.zoom,
        );

        const newPos = snapResult.position;
        store.setGuideLines(snapResult.guideLines ?? []);

        store.updatePlanDirect({
          ...plan,
          vertices: {
            ...plan.vertices,
            [dragVertexId.current]: {
              ...plan.vertices[dragVertexId.current],
              position: newPos,
            },
          },
        });

        store.setDragState({
          vertexId: dragVertexId.current,
          startPosition: dragStartPos.current,
          currentPosition: newPos,
        });
        return;
      }

      // Hover detection
      if (mode === "select") {
        const hit = pickAtPosition(
          rawPos,
          plan,
          150 / Math.max(store.camera.zoom, 0.1),
          100 / Math.max(store.camera.zoom, 0.1),
        );
        store.setHoveredItem(hit ? { type: hit.type, id: hit.id } : null);
      }
    },
    [getPlanPos, getSnapCandidates],
  );

  const handlePointerUp = useCallback((_e: PointerEvent) => {
    if (isDragging.current && dragVertexId.current) {
      const store = useEditorStore.getState();
      const currentPos = store.plan.vertices[dragVertexId.current]?.position;

      if (currentPos && distance(dragStartPos.current, currentPos) > 0.1) {
        // Restore original, then execute command for history
        store.updatePlanDirect({
          ...store.plan,
          vertices: {
            ...store.plan.vertices,
            [dragVertexId.current]: {
              ...store.plan.vertices[dragVertexId.current],
              position: dragStartPos.current,
            },
          },
        });
        store.executeCommand({
          type: "MOVE_VERTEX",
          vertexId: dragVertexId.current,
          from: dragStartPos.current,
          to: currentPos,
        });
      }

      store.setDragState(null);
      store.setGuideLines([]);
    }
    isDragging.current = false;
    dragVertexId.current = null;
  }, []);

  // Attach events
  React.useEffect(() => {
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

// ---- Helper functions for mode-specific actions ----

function handleDrawClick(
  store: ReturnType<typeof useEditorStore.getState>,
  pos: Vec2,
  _rawPos: Vec2,
) {
  const { plan, drawState } = store;

  // If closing
  if (drawState.isClosing && drawState.vertexIds.length >= 3) {
    const firstId = drawState.vertexIds[0];
    const lastId = drawState.vertexIds[drawState.vertexIds.length - 1];

    // Add closing edge
    store.executeCommand({ type: "ADD_EDGE", startId: lastId, endId: firstId });
    store.resetDrawState();
    store.setMode("select");
    return;
  }

  if (drawState.vertexIds.length === 0) {
    // First point
    const result = require("@/domain/plan/mutations").addVertex(plan, pos);
    store.updatePlanDirect(result.plan);
    // We need to manually track without command for intermediate draw state
    // Actually, let's commit each vertex/edge via commands for undo support
    store.executeCommand({ type: "ADD_VERTEX", position: pos });

    // Find the vertex we just created
    const newPlan = store.plan;
    const newVertex = Object.values(newPlan.vertices).find(
      (v) => distance(v.position, pos) < 1,
    );
    if (newVertex) {
      store.setDrawState({ vertexIds: [newVertex.id] });
    }
  } else {
    // Subsequent points
    const lastId = drawState.vertexIds[drawState.vertexIds.length - 1];

    // Add vertex and edge
    store.executeCommand({
      type: "ADD_VERTEX_AND_EDGE",
      fromVertexId: lastId,
      position: pos,
    });

    // Find new vertex
    const newPlan = store.plan;
    const newVertex = Object.values(newPlan.vertices).find(
      (v) =>
        distance(v.position, pos) < 1 && !drawState.vertexIds.includes(v.id),
    );
    if (newVertex) {
      store.setDrawState({
        vertexIds: [...drawState.vertexIds, newVertex.id],
      });
    }
  }
}

function handleSplitClick(
  store: ReturnType<typeof useEditorStore.getState>,
  pos: Vec2,
) {
  const { plan } = store;

  // Find closest edge
  let bestEdgeId: string | null = null;
  let bestDist = Infinity;
  let bestPoint: Vec2 | null = null;

  for (const edge of Object.values(plan.edges)) {
    const start = plan.vertices[edge.startId];
    const end = plan.vertices[edge.endId];
    if (!start || !end) continue;

    const { closestPointOnSegment } = require("@/domain/geometry/vec2");
    const { point, t } = closestPointOnSegment(
      pos,
      start.position,
      end.position,
    );
    const d = distance(pos, point);

    if (
      d < 200 / Math.max(store.camera.zoom, 0.1) &&
      t > 0.05 &&
      t < 0.95 &&
      d < bestDist
    ) {
      bestDist = d;
      bestEdgeId = edge.id;
      bestPoint = point;
    }
  }

  if (bestEdgeId && bestPoint) {
    const edge = plan.edges[bestEdgeId];

    store.executeCommand({
      type: "BATCH",
      label: "Split Edge",
      commands: [{ type: "ADD_VERTEX", position: bestPoint }],
    });

    // Find new vertex
    const newPlan = store.plan;
    const newVertex = Object.values(newPlan.vertices).find(
      (v) => distance(v.position, bestPoint!) < 1,
    );

    if (newVertex && edge) {
      store.executeCommand({
        type: "BATCH",
        label: "Reconnect Split",
        commands: [
          { type: "REMOVE_EDGE", edgeId: bestEdgeId },
          { type: "ADD_EDGE", startId: edge.startId, endId: newVertex.id },
          { type: "ADD_EDGE", startId: newVertex.id, endId: edge.endId },
        ],
      });
    }
  }
}
