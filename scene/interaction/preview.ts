import { Vec2 } from "@/domain/geometry/vec2";

export interface DrawPreview {
  completedEdges: { start: Vec2; end: Vec2 }[];
  previewEdge: { start: Vec2; end: Vec2 } | null;
  vertices: Vec2[];
  closingEdge: { start: Vec2; end: Vec2 } | null;
}

export function buildDrawPreview(
  placedVertexPositions: Vec2[],
  cursorPosition: Vec2 | null,
  isClosing: boolean,
): DrawPreview {
  const completedEdges: { start: Vec2; end: Vec2 }[] = [];
  for (let i = 0; i < placedVertexPositions.length - 1; i++) {
    completedEdges.push({
      start: placedVertexPositions[i],
      end: placedVertexPositions[i + 1],
    });
  }

  let previewEdge: { start: Vec2; end: Vec2 } | null = null;
  if (placedVertexPositions.length > 0 && cursorPosition) {
    previewEdge = {
      start: placedVertexPositions[placedVertexPositions.length - 1],
      end: cursorPosition,
    };
  }

  let closingEdge: { start: Vec2; end: Vec2 } | null = null;
  if (isClosing && placedVertexPositions.length >= 3 && cursorPosition) {
    closingEdge = {
      start: cursorPosition,
      end: placedVertexPositions[0],
    };
  }

  return {
    completedEdges,
    previewEdge,
    vertices: placedVertexPositions,
    closingEdge,
  };
}
