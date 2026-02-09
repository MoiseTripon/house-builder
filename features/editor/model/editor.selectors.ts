import { useEditorStore } from "./editor.store";
import { Plan, getEdgeVertices, getFaceVertices } from "@/domain/plan/types";
import { Selection, getSelectedIds } from "./selection.types";
import { Vec2, distance, midpoint } from "@/domain/geometry/vec2";

export function usePlan(): Plan {
  return useEditorStore((s) => s.plan);
}

export function useVertices() {
  return useEditorStore((s) => Object.values(s.plan.vertices));
}

export function useEdges() {
  return useEditorStore((s) => Object.values(s.plan.edges));
}

export function useFaces() {
  return useEditorStore((s) => Object.values(s.plan.faces));
}

export function useEdgeWithPositions() {
  return useEditorStore((s) => {
    return Object.values(s.plan.edges).map((edge) => {
      const start = s.plan.vertices[edge.startId];
      const end = s.plan.vertices[edge.endId];
      return {
        ...edge,
        startPos: start?.position ?? { x: 0, y: 0 },
        endPos: end?.position ?? { x: 0, y: 0 },
        length: start && end ? distance(start.position, end.position) : 0,
        midpoint:
          start && end
            ? midpoint(start.position, end.position)
            : { x: 0, y: 0 },
      };
    });
  });
}

export function useFaceWithPositions() {
  return useEditorStore((s) => {
    return Object.values(s.plan.faces).map((face) => {
      const vertices = face.vertexIds
        .map((vid) => s.plan.vertices[vid])
        .filter(Boolean);
      return {
        ...face,
        positions: vertices.map((v) => v.position),
      };
    });
  });
}

export function useSelectedVertexIds(): string[] {
  return useEditorStore((s) => getSelectedIds(s.selection, "vertex"));
}

export function useSelectedEdgeIds(): string[] {
  return useEditorStore((s) => getSelectedIds(s.selection, "edge"));
}

export function useSelectedFaceIds(): string[] {
  return useEditorStore((s) => getSelectedIds(s.selection, "face"));
}

export function useMode() {
  return useEditorStore((s) => s.mode);
}

export function useSnapConfig() {
  return useEditorStore((s) => s.snapConfig);
}
