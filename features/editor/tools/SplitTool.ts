import { Tool, ToolEvent } from "./ToolHost";
import { useEditorStore } from "../model/editor.store";
import { Vec2, distance, closestPointOnSegment } from "@/domain/geometry/vec2";
import { computeSnap } from "@/domain/geometry/snap";
import { addVertex, addEdge } from "@/domain/plan/mutations";

const EDGE_HIT_RADIUS = 15;

export function createSplitTool(): Tool {
  let splitEdgeId: string | null = null;
  let splitPoint: Vec2 | null = null;

  return {
    name: "split",

    onPointerMove(event: ToolEvent) {
      const store = useEditorStore.getState();
      const { plan } = store;
      const pos = event.planPosition;

      splitEdgeId = null;
      splitPoint = null;

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

        if (d < EDGE_HIT_RADIUS && t > 0.05 && t < 0.95) {
          splitEdgeId = edge.id;
          splitPoint = point;
          store.setDrawState({ previewPosition: point });
          store.setHoveredItem({ type: "edge", id: edge.id });
          return;
        }
      }

      store.setDrawState({ previewPosition: null });
      store.setHoveredItem(null);
    },

    onPointerDown(event: ToolEvent) {
      if (!splitEdgeId || !splitPoint) return;

      const store = useEditorStore.getState();
      const { plan } = store;
      const edge = plan.edges[splitEdgeId];
      if (!edge) return;

      // Split: remove old edge, add vertex, add two new edges
      store.executeCommand({
        type: "BATCH",
        label: "Split Edge",
        commands: [
          { type: "REMOVE_EDGE", edgeId: splitEdgeId },
          { type: "ADD_VERTEX", position: splitPoint },
        ],
      });

      // After batch, find the new vertex and connect edges
      const newPlan = store.plan;
      // Find the vertex at splitPoint
      const newVertex = Object.values(newPlan.vertices).find(
        (v) => distance(v.position, splitPoint!) < 1,
      );

      if (newVertex) {
        store.executeCommand({
          type: "BATCH",
          label: "Connect Split Edges",
          commands: [
            { type: "ADD_EDGE", startId: edge.startId, endId: newVertex.id },
            { type: "ADD_EDGE", startId: newVertex.id, endId: edge.endId },
          ],
        });
      }

      splitEdgeId = null;
      splitPoint = null;
    },

    onDeactivate() {
      splitEdgeId = null;
      splitPoint = null;
    },
  };
}
