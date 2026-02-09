import { Tool, ToolEvent } from "./ToolHost";
import { useEditorStore } from "../model/editor.store";
import {
  singleSelection,
  toggleInSelection,
  emptySelection,
  SelectionType,
} from "../model/selection.types";
import { Vec2, distance } from "@/domain/geometry/vec2";
import { distanceToSegment } from "@/domain/geometry/vec2";
import { computeSnap } from "@/domain/geometry/snap";

const VERTEX_HIT_RADIUS = 15; // in plan units (mm)
const EDGE_HIT_RADIUS = 10;

export function createSelectTool(): Tool {
  return {
    name: "select",

    onPointerDown(event: ToolEvent) {
      const store = useEditorStore.getState();
      const { plan, snapConfig } = store;
      const pos = event.planPosition;

      // 1. Hit test vertices
      let closestVertexId: string | null = null;
      let closestVertexDist = Infinity;

      for (const v of Object.values(plan.vertices)) {
        const d = distance(pos, v.position);
        if (d < VERTEX_HIT_RADIUS && d < closestVertexDist) {
          closestVertexDist = d;
          closestVertexId = v.id;
        }
      }

      if (closestVertexId) {
        if (event.shiftKey) {
          store.setSelection(
            toggleInSelection(store.selection, "vertex", closestVertexId),
          );
        } else {
          store.setSelection(singleSelection("vertex", closestVertexId));
        }

        // Start drag
        const vertex = plan.vertices[closestVertexId];
        if (vertex) {
          store.setDragState({
            vertexId: closestVertexId,
            startPosition: { ...vertex.position },
            currentPosition: { ...vertex.position },
          });
        }
        return;
      }

      // 2. Hit test edges
      let closestEdgeId: string | null = null;
      let closestEdgeDist = Infinity;

      for (const edge of Object.values(plan.edges)) {
        const start = plan.vertices[edge.startId];
        const end = plan.vertices[edge.endId];
        if (!start || !end) continue;

        const d = distanceToSegment(pos, start.position, end.position);
        if (d < EDGE_HIT_RADIUS && d < closestEdgeDist) {
          closestEdgeDist = d;
          closestEdgeId = edge.id;
        }
      }

      if (closestEdgeId) {
        if (event.shiftKey) {
          store.setSelection(
            toggleInSelection(store.selection, "edge", closestEdgeId),
          );
        } else {
          store.setSelection(singleSelection("edge", closestEdgeId));
        }
        return;
      }

      // 3. Hit test faces
      // Simple point-in-polygon for each face
      const { pointInPolygon } = require("@/domain/geometry/polygon");
      for (const face of Object.values(plan.faces)) {
        const positions = face.vertexIds
          .map((vid) => plan.vertices[vid]?.position)
          .filter(Boolean) as Vec2[];

        if (positions.length >= 3 && pointInPolygon(pos, positions)) {
          if (event.shiftKey) {
            store.setSelection(
              toggleInSelection(store.selection, "face", face.id),
            );
          } else {
            store.setSelection(singleSelection("face", face.id));
          }
          return;
        }
      }

      // 4. Click on empty space = clear selection
      if (!event.shiftKey) {
        store.clearSelection();
      }
    },

    onPointerMove(event: ToolEvent) {
      const store = useEditorStore.getState();
      const { plan, dragState, snapConfig } = store;

      // Handle drag
      if (dragState) {
        const vertices = Object.values(plan.vertices)
          .filter((v) => v.id !== dragState.vertexId)
          .map((v) => ({ id: v.id, position: v.position }));

        const edges = Object.values(plan.edges).map((e) => ({
          id: e.id,
          start: plan.vertices[e.startId]?.position ?? { x: 0, y: 0 },
          end: plan.vertices[e.endId]?.position ?? { x: 0, y: 0 },
        }));

        const snapResult = computeSnap(
          event.planPosition,
          snapConfig,
          vertices,
          edges,
          undefined,
          store.camera.zoom,
        );

        const newPos = snapResult.position;
        store.setDragState({
          ...dragState,
          currentPosition: newPos,
        });

        store.setGuideLines(snapResult.guideLines ?? []);

        // Live update vertex position (without history)
        const updatedPlan = {
          ...plan,
          vertices: {
            ...plan.vertices,
            [dragState.vertexId]: {
              ...plan.vertices[dragState.vertexId],
              position: newPos,
            },
          },
        };
        store.updatePlanDirect(updatedPlan);
        return;
      }

      // Hover detection
      const pos = event.planPosition;
      let hovered: { type: SelectionType; id: string } | null = null;

      for (const v of Object.values(plan.vertices)) {
        if (distance(pos, v.position) < VERTEX_HIT_RADIUS) {
          hovered = { type: "vertex", id: v.id };
          break;
        }
      }

      if (!hovered) {
        for (const edge of Object.values(plan.edges)) {
          const start = plan.vertices[edge.startId];
          const end = plan.vertices[edge.endId];
          if (!start || !end) continue;
          if (
            distanceToSegment(pos, start.position, end.position) <
            EDGE_HIT_RADIUS
          ) {
            hovered = { type: "edge", id: edge.id };
            break;
          }
        }
      }

      store.setHoveredItem(hovered);
    },

    onPointerUp(event: ToolEvent) {
      const store = useEditorStore.getState();
      const { dragState } = store;

      if (dragState) {
        const movedDist = distance(
          dragState.startPosition,
          dragState.currentPosition,
        );
        if (movedDist > 0.1) {
          // Commit the move as a command (restore original, then apply command)
          const originalPlan = {
            ...store.plan,
            vertices: {
              ...store.plan.vertices,
              [dragState.vertexId]: {
                ...store.plan.vertices[dragState.vertexId],
                position: dragState.startPosition,
              },
            },
          };
          store.updatePlanDirect(originalPlan);
          store.executeCommand({
            type: "MOVE_VERTEX",
            vertexId: dragState.vertexId,
            from: dragState.startPosition,
            to: dragState.currentPosition,
          });
        }
        store.setDragState(null);
        store.setGuideLines([]);
      }
    },

    onKeyDown(event: ToolEvent) {
      const store = useEditorStore.getState();

      if (event.key === "Delete" || event.key === "Backspace") {
        const { selection, plan } = store;

        // Delete selected vertices
        for (const item of selection.items) {
          if (item.type === "vertex") {
            store.executeCommand({ type: "REMOVE_VERTEX", vertexId: item.id });
          }
          if (item.type === "edge") {
            store.executeCommand({ type: "REMOVE_EDGE", edgeId: item.id });
          }
        }
        store.clearSelection();
      }
    },
  };
}
