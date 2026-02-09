import { Plan, getEdgeVertices } from "./types";
import { segmentsSelfIntersect } from "../geometry/intersect";
import { Vec2, distance } from "../geometry/vec2";
import { polygonSignedArea, isConvex } from "../geometry/polygon";

export interface ValidationError {
  type:
    | "self_intersection"
    | "degenerate_edge"
    | "degenerate_face"
    | "orphan_vertex"
    | "duplicate_edge";
  message: string;
  entityIds: string[];
}

export function validatePlan(plan: Plan): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for degenerate edges (zero length)
  for (const edge of Object.values(plan.edges)) {
    const verts = getEdgeVertices(plan, edge.id);
    if (!verts) continue;
    if (distance(verts.start.position, verts.end.position) < 1e-4) {
      errors.push({
        type: "degenerate_edge",
        message: `Edge ${edge.id} has zero length`,
        entityIds: [edge.id],
      });
    }
  }

  // Check for duplicate edges
  const edgePairs = new Set<string>();
  for (const edge of Object.values(plan.edges)) {
    const pair1 = `${edge.startId}:${edge.endId}`;
    const pair2 = `${edge.endId}:${edge.startId}`;
    if (edgePairs.has(pair1) || edgePairs.has(pair2)) {
      errors.push({
        type: "duplicate_edge",
        message: `Duplicate edge between ${edge.startId} and ${edge.endId}`,
        entityIds: [edge.id],
      });
    }
    edgePairs.add(pair1);
  }

  // Check for orphan vertices
  const usedVertexIds = new Set<string>();
  for (const edge of Object.values(plan.edges)) {
    usedVertexIds.add(edge.startId);
    usedVertexIds.add(edge.endId);
  }
  for (const vid of Object.keys(plan.vertices)) {
    if (!usedVertexIds.has(vid)) {
      errors.push({
        type: "orphan_vertex",
        message: `Vertex ${vid} is not connected to any edge`,
        entityIds: [vid],
      });
    }
  }

  // Check for self-intersecting faces
  for (const face of Object.values(plan.faces)) {
    const positions: Vec2[] = face.vertexIds
      .map((vid) => plan.vertices[vid]?.position)
      .filter(Boolean) as Vec2[];

    if (positions.length < 3) {
      errors.push({
        type: "degenerate_face",
        message: `Face ${face.id} has fewer than 3 vertices`,
        entityIds: [face.id],
      });
      continue;
    }

    const area = Math.abs(polygonSignedArea(positions));
    if (area < 1e-4) {
      errors.push({
        type: "degenerate_face",
        message: `Face ${face.id} has near-zero area`,
        entityIds: [face.id],
      });
    }

    const segments = positions.map((p, i) => ({
      start: p,
      end: positions[(i + 1) % positions.length],
    }));

    if (segmentsSelfIntersect(segments)) {
      errors.push({
        type: "self_intersection",
        message: `Face ${face.id} has self-intersecting edges`,
        entityIds: [face.id],
      });
    }
  }

  return errors;
}

export function isPlanValid(plan: Plan): boolean {
  return validatePlan(plan).length === 0;
}

export function canDeleteVertex(
  plan: Plan,
  vertexId: string,
): { allowed: boolean; reason?: string } {
  const connectedEdges = Object.values(plan.edges).filter(
    (e) => e.startId === vertexId || e.endId === vertexId,
  );

  // Check if deleting would break any face below 3 vertices
  const affectedFaces = Object.values(plan.faces).filter((f) =>
    f.vertexIds.includes(vertexId),
  );

  for (const face of affectedFaces) {
    if (face.vertexIds.length <= 3) {
      return {
        allowed: false,
        reason: `Deleting vertex would reduce face ${face.id} below 3 vertices`,
      };
    }
  }

  return { allowed: true };
}

export function canDeleteEdge(
  plan: Plan,
  edgeId: string,
): { allowed: boolean; reason?: string } {
  return { allowed: true };
}
