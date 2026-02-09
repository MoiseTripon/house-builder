import { Plan, Vertex, Edge, Face } from "./types";
import { Vec2, distance } from "../geometry/vec2";
import { generateId } from "../../shared/lib/ids";
import { rebuildFaces } from "./faces";

export function addVertex(
  plan: Plan,
  position: Vec2,
): { plan: Plan; vertexId: string } {
  const id = generateId("v");
  const vertex: Vertex = { id, position };
  return {
    plan: {
      ...plan,
      vertices: { ...plan.vertices, [id]: vertex },
    },
    vertexId: id,
  };
}

export function moveVertex(plan: Plan, vertexId: string, position: Vec2): Plan {
  const vertex = plan.vertices[vertexId];
  if (!vertex) return plan;
  return {
    ...plan,
    vertices: {
      ...plan.vertices,
      [vertexId]: { ...vertex, position },
    },
  };
}

export function removeVertex(plan: Plan, vertexId: string): Plan {
  // Remove all edges connected to this vertex
  const connectedEdges = Object.values(plan.edges).filter(
    (e) => e.startId === vertexId || e.endId === vertexId,
  );

  let newPlan = { ...plan };
  for (const edge of connectedEdges) {
    newPlan = removeEdge(newPlan, edge.id);
  }

  const { [vertexId]: _, ...remainingVertices } = newPlan.vertices;
  newPlan = { ...newPlan, vertices: remainingVertices };
  return newPlan;
}

export function addEdge(
  plan: Plan,
  startId: string,
  endId: string,
): { plan: Plan; edgeId: string } {
  // Check if edge already exists
  const existing = Object.values(plan.edges).find(
    (e) =>
      (e.startId === startId && e.endId === endId) ||
      (e.startId === endId && e.endId === startId),
  );
  if (existing) return { plan, edgeId: existing.id };

  const id = generateId("e");
  const edge: Edge = { id, startId, endId };
  const newPlan = {
    ...plan,
    edges: { ...plan.edges, [id]: edge },
  };

  // Rebuild faces after topology change
  return {
    plan: rebuildFaces(newPlan),
    edgeId: id,
  };
}

export function removeEdge(plan: Plan, edgeId: string): Plan {
  const { [edgeId]: _, ...remainingEdges } = plan.edges;
  // Remove faces referencing this edge
  const remainingFaces: Record<string, Face> = {};
  for (const [fid, face] of Object.entries(plan.faces)) {
    if (!face.edgeIds.includes(edgeId)) {
      remainingFaces[fid] = face;
    }
  }
  return {
    ...plan,
    edges: remainingEdges,
    faces: remainingFaces,
  };
}

export function addVertexAndEdge(
  plan: Plan,
  fromVertexId: string,
  position: Vec2,
): { plan: Plan; vertexId: string; edgeId: string } {
  const { plan: plan1, vertexId } = addVertex(plan, position);
  const { plan: plan2, edgeId } = addEdge(plan1, fromVertexId, vertexId);
  return { plan: plan2, vertexId, edgeId };
}

export function mergeVertices(
  plan: Plan,
  keepId: string,
  removeId: string,
  tolerance: number = 50,
): Plan {
  const keep = plan.vertices[keepId];
  const remove = plan.vertices[removeId];
  if (!keep || !remove) return plan;
  if (distance(keep.position, remove.position) > tolerance) return plan;

  // Redirect all edges from removeId to keepId
  const updatedEdges: Record<string, Edge> = {};
  for (const [eid, edge] of Object.entries(plan.edges)) {
    let newEdge = edge;
    if (edge.startId === removeId) {
      newEdge = { ...newEdge, startId: keepId };
    }
    if (edge.endId === removeId) {
      newEdge = { ...newEdge, endId: keepId };
    }
    // Skip degenerate edges
    if (newEdge.startId === newEdge.endId) continue;
    updatedEdges[eid] = newEdge;
  }

  const { [removeId]: _, ...remainingVertices } = plan.vertices;
  return rebuildFaces({
    vertices: remainingVertices,
    edges: updatedEdges,
    faces: {},
  });
}

export function setEdgeLength(
  plan: Plan,
  edgeId: string,
  newLength: number,
  anchorVertexId?: string,
): Plan {
  const edge = plan.edges[edgeId];
  if (!edge) return plan;
  const startV = plan.vertices[edge.startId];
  const endV = plan.vertices[edge.endId];
  if (!startV || !endV) return plan;

  const currentLength = distance(startV.position, endV.position);
  if (currentLength < 1e-6) return plan;

  const dx = endV.position.x - startV.position.x;
  const dy = endV.position.y - startV.position.y;
  const ratio = newLength / currentLength;

  if (anchorVertexId === edge.endId) {
    // Move start vertex
    const newPos: Vec2 = {
      x: endV.position.x - dx * ratio,
      y: endV.position.y - dy * ratio,
    };
    return moveVertex(plan, edge.startId, newPos);
  } else {
    // Move end vertex (default)
    const newPos: Vec2 = {
      x: startV.position.x + dx * ratio,
      y: startV.position.y + dy * ratio,
    };
    return moveVertex(plan, edge.endId, newPos);
  }
}

export function createRectangle(
  plan: Plan,
  center: Vec2,
  width: number,
  height: number,
): {
  plan: Plan;
  vertexIds: string[];
  edgeIds: string[];
  faceId: string | null;
} {
  const hw = width / 2;
  const hh = height / 2;
  const positions: Vec2[] = [
    { x: center.x - hw, y: center.y - hh },
    { x: center.x + hw, y: center.y - hh },
    { x: center.x + hw, y: center.y + hh },
    { x: center.x - hw, y: center.y + hh },
  ];

  let currentPlan = plan;
  const vertexIds: string[] = [];
  const edgeIds: string[] = [];

  for (const pos of positions) {
    const { plan: p, vertexId } = addVertex(currentPlan, pos);
    currentPlan = p;
    vertexIds.push(vertexId);
  }

  for (let i = 0; i < 4; i++) {
    const { plan: p, edgeId } = addEdge(
      currentPlan,
      vertexIds[i],
      vertexIds[(i + 1) % 4],
    );
    currentPlan = p;
    edgeIds.push(edgeId);
  }

  const faceIds = Object.keys(currentPlan.faces);
  const newFaceId = faceIds.find((id) => !plan.faces[id]) ?? null;

  return { plan: currentPlan, vertexIds, edgeIds, faceId: newFaceId };
}

export function createLShape(
  plan: Plan,
  center: Vec2,
  params: {
    totalWidth: number;
    totalHeight: number;
    cutoutWidth: number;
    cutoutHeight: number;
  },
): { plan: Plan; vertexIds: string[]; edgeIds: string[] } {
  const { totalWidth, totalHeight, cutoutWidth, cutoutHeight } = params;
  const hw = totalWidth / 2;
  const hh = totalHeight / 2;

  const positions: Vec2[] = [
    { x: center.x - hw, y: center.y - hh },
    { x: center.x + hw, y: center.y - hh },
    { x: center.x + hw, y: center.y - hh + (totalHeight - cutoutHeight) },
    {
      x: center.x - hw + (totalWidth - cutoutWidth),
      y: center.y - hh + (totalHeight - cutoutHeight),
    },
    { x: center.x - hw + (totalWidth - cutoutWidth), y: center.y + hh },
    { x: center.x - hw, y: center.y + hh },
  ];

  let currentPlan = plan;
  const vertexIds: string[] = [];
  const edgeIds: string[] = [];

  for (const pos of positions) {
    const { plan: p, vertexId } = addVertex(currentPlan, pos);
    currentPlan = p;
    vertexIds.push(vertexId);
  }

  for (let i = 0; i < positions.length; i++) {
    const { plan: p, edgeId } = addEdge(
      currentPlan,
      vertexIds[i],
      vertexIds[(i + 1) % positions.length],
    );
    currentPlan = p;
    edgeIds.push(edgeId);
  }

  return { plan: currentPlan, vertexIds, edgeIds };
}
