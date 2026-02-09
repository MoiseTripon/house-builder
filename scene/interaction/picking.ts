import { Vec2, distance, distanceToSegment } from "@/domain/geometry/vec2";
import { Plan } from "@/domain/plan/types";
import { pointInPolygon } from "@/domain/geometry/polygon";
import { SelectionType } from "@/features/editor/model/selection.types";

export interface HitResult {
  type: SelectionType;
  id: string;
  distance: number;
}

export function pickAtPosition(
  pos: Vec2,
  plan: Plan,
  vertexRadius: number = 150,
  edgeRadius: number = 100,
): HitResult | null {
  // Priority: vertex > edge > face
  let bestVertex: HitResult | null = null;
  for (const v of Object.values(plan.vertices)) {
    const d = distance(pos, v.position);
    if (d < vertexRadius && (!bestVertex || d < bestVertex.distance)) {
      bestVertex = { type: "vertex", id: v.id, distance: d };
    }
  }
  if (bestVertex) return bestVertex;

  let bestEdge: HitResult | null = null;
  for (const edge of Object.values(plan.edges)) {
    const start = plan.vertices[edge.startId];
    const end = plan.vertices[edge.endId];
    if (!start || !end) continue;
    const d = distanceToSegment(pos, start.position, end.position);
    if (d < edgeRadius && (!bestEdge || d < bestEdge.distance)) {
      bestEdge = { type: "edge", id: edge.id, distance: d };
    }
  }
  if (bestEdge) return bestEdge;

  for (const face of Object.values(plan.faces)) {
    const positions = face.vertexIds
      .map((vid) => plan.vertices[vid]?.position)
      .filter(Boolean) as Vec2[];
    if (positions.length >= 3 && pointInPolygon(pos, positions)) {
      return { type: "face", id: face.id, distance: 0 };
    }
  }

  return null;
}
