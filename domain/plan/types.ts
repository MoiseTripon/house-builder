import { Vec2 } from "../geometry/vec2";

export interface Vertex {
  id: string;
  position: Vec2;
}

export interface Edge {
  id: string;
  startId: string;
  endId: string;
}

export interface Face {
  id: string;
  edgeIds: string[]; // ordered edges forming the boundary
  vertexIds: string[]; // ordered vertices (CCW winding)
}

export interface Plan {
  vertices: Record<string, Vertex>;
  edges: Record<string, Edge>;
  faces: Record<string, Face>;
}

export function createEmptyPlan(): Plan {
  return {
    vertices: {},
    edges: {},
    faces: {},
  };
}

export function getVertexPosition(plan: Plan, vertexId: string): Vec2 | null {
  return plan.vertices[vertexId]?.position ?? null;
}

export function getEdgeVertices(
  plan: Plan,
  edgeId: string,
): { start: Vertex; end: Vertex } | null {
  const edge = plan.edges[edgeId];
  if (!edge) return null;
  const start = plan.vertices[edge.startId];
  const end = plan.vertices[edge.endId];
  if (!start || !end) return null;
  return { start, end };
}

export function getFaceVertices(plan: Plan, faceId: string): Vertex[] {
  const face = plan.faces[faceId];
  if (!face) return [];
  return face.vertexIds.map((id) => plan.vertices[id]).filter(Boolean);
}

export function getEdgesForVertex(plan: Plan, vertexId: string): Edge[] {
  return Object.values(plan.edges).filter(
    (e) => e.startId === vertexId || e.endId === vertexId,
  );
}

export function getFacesForEdge(plan: Plan, edgeId: string): Face[] {
  return Object.values(plan.faces).filter((f) => f.edgeIds.includes(edgeId));
}

export function getFacesForVertex(plan: Plan, vertexId: string): Face[] {
  return Object.values(plan.faces).filter((f) =>
    f.vertexIds.includes(vertexId),
  );
}
