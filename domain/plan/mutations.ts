import { Plan, Vertex, Edge, Face, findVertexNear, edgeExists } from "./types";
import {
  Vec2,
  distance,
  sub,
  add,
  scale as vecScale,
  closestPointOnSegment,
} from "../geometry/vec2";
import { generateId } from "../../shared/lib/ids";
import { rebuildFaces } from "./faces";
import { polygonCentroid } from "../geometry/polygon";

export function addVertex(
  plan: Plan,
  position: Vec2,
): { plan: Plan; vertexId: string } {
  const id = generateId("v");
  const vertex: Vertex = { id, position };
  return {
    plan: { ...plan, vertices: { ...plan.vertices, [id]: vertex } },
    vertexId: id,
  };
}

export function moveVertex(plan: Plan, vertexId: string, position: Vec2): Plan {
  const vertex = plan.vertices[vertexId];
  if (!vertex) return plan;
  return {
    ...plan,
    vertices: { ...plan.vertices, [vertexId]: { ...vertex, position } },
  };
}

export function removeVertex(plan: Plan, vertexId: string): Plan {
  const connectedEdges = Object.values(plan.edges).filter(
    (e) => e.startId === vertexId || e.endId === vertexId,
  );
  let newPlan = { ...plan };
  for (const edge of connectedEdges) {
    newPlan = removeEdge(newPlan, edge.id);
  }
  const { [vertexId]: _, ...remainingVertices } = newPlan.vertices;
  return { ...newPlan, vertices: remainingVertices };
}

export function addEdge(
  plan: Plan,
  startId: string,
  endId: string,
): { plan: Plan; edgeId: string } {
  if (startId === endId) return { plan, edgeId: "" };
  const existing = Object.values(plan.edges).find(
    (e) =>
      (e.startId === startId && e.endId === endId) ||
      (e.startId === endId && e.endId === startId),
  );
  if (existing) return { plan, edgeId: existing.id };

  const id = generateId("e");
  const edge: Edge = { id, startId, endId };
  const newPlan = { ...plan, edges: { ...plan.edges, [id]: edge } };
  return { plan: rebuildFaces(newPlan), edgeId: id };
}

export function removeEdge(plan: Plan, edgeId: string): Plan {
  const { [edgeId]: _, ...remainingEdges } = plan.edges;
  const remainingFaces: Record<string, Face> = {};
  for (const [fid, face] of Object.entries(plan.faces)) {
    if (!face.edgeIds.includes(edgeId)) {
      remainingFaces[fid] = face;
    }
  }
  return { ...plan, edges: remainingEdges, faces: remainingFaces };
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

/**
 * Merge two vertices: redirect all edges from `removeId` to `keepId`,
 * remove duplicate/degenerate edges, remove the old vertex, rebuild faces.
 */
export function mergeVertices(
  plan: Plan,
  keepId: string,
  removeId: string,
): Plan {
  if (keepId === removeId) return plan;
  const keep = plan.vertices[keepId];
  const remove = plan.vertices[removeId];
  if (!keep || !remove) return plan;

  const updatedEdges: Record<string, Edge> = {};
  const seenPairs = new Set<string>();

  for (const [eid, edge] of Object.entries(plan.edges)) {
    let sId = edge.startId === removeId ? keepId : edge.startId;
    let eId = edge.endId === removeId ? keepId : edge.endId;

    // Skip degenerate
    if (sId === eId) continue;

    // Canonical pair key to skip duplicates
    const pairKey = sId < eId ? `${sId}:${eId}` : `${eId}:${sId}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    updatedEdges[eid] = { ...edge, startId: sId, endId: eId };
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
    const newPos: Vec2 = {
      x: endV.position.x - dx * ratio,
      y: endV.position.y - dy * ratio,
    };
    return moveVertex(plan, edge.startId, newPos);
  } else {
    const newPos: Vec2 = {
      x: startV.position.x + dx * ratio,
      y: startV.position.y + dy * ratio,
    };
    return moveVertex(plan, edge.endId, newPos);
  }
}

/**
 * Split an edge by inserting a vertex at `position`.
 * Removes the old edge, creates two new edges through the new vertex.
 * Returns the new vertex id.
 */
export function splitEdgeAtPoint(
  plan: Plan,
  edgeId: string,
  position: Vec2,
): { plan: Plan; vertexId: string } {
  const edge = plan.edges[edgeId];
  if (!edge) return { plan, vertexId: "" };

  const { plan: p1, vertexId } = addVertex(plan, position);
  let p2 = removeEdge(p1, edgeId);
  const { plan: p3 } = addEdge(p2, edge.startId, vertexId);
  const { plan: p4 } = addEdge(p3, vertexId, edge.endId);

  return { plan: p4, vertexId };
}

/**
 * Find if a point lies on any edge (within tolerance).
 * Returns the edge id and the closest point on it, or null.
 */
export function findEdgeAtPoint(
  plan: Plan,
  position: Vec2,
  tolerance: number,
): { edgeId: string; point: Vec2; t: number } | null {
  let bestEdgeId: string | null = null;
  let bestDist = Infinity;
  let bestPoint: Vec2 | null = null;
  let bestT = 0;

  for (const edge of Object.values(plan.edges)) {
    const start = plan.vertices[edge.startId];
    const end = plan.vertices[edge.endId];
    if (!start || !end) continue;

    const { point, t } = closestPointOnSegment(
      position,
      start.position,
      end.position,
    );
    const d = distance(position, point);

    // Avoid snapping to endpoints (those are vertex snaps)
    if (d < tolerance && t > 0.02 && t < 0.98 && d < bestDist) {
      bestDist = d;
      bestEdgeId = edge.id;
      bestPoint = point;
      bestT = t;
    }
  }

  if (bestEdgeId && bestPoint) {
    return { edgeId: bestEdgeId, point: bestPoint, t: bestT };
  }
  return null;
}

export function scaleFace(
  plan: Plan,
  faceId: string,
  scaleX: number,
  scaleY: number,
  center?: Vec2,
): Plan {
  const face = plan.faces[faceId];
  if (!face) return plan;

  const positions = face.vertexIds
    .map((vid) => plan.vertices[vid]?.position)
    .filter(Boolean) as Vec2[];
  if (positions.length < 3) return plan;

  const c = center ?? polygonCentroid(positions);
  let updatedPlan = plan;

  for (const vid of face.vertexIds) {
    const v = updatedPlan.vertices[vid];
    if (!v) continue;
    const offset = sub(v.position, c);
    const newPos: Vec2 = {
      x: c.x + offset.x * scaleX,
      y: c.y + offset.y * scaleY,
    };
    updatedPlan = moveVertex(updatedPlan, vid, newPos);
  }

  return updatedPlan;
}

export function deleteFace(plan: Plan, faceId: string): Plan {
  const face = plan.faces[faceId];
  if (!face) return plan;

  const otherFaces = Object.values(plan.faces).filter((f) => f.id !== faceId);
  const sharedEdgeIds = new Set<string>();
  for (const of_ of otherFaces) {
    for (const eid of of_.edgeIds) sharedEdgeIds.add(eid);
  }

  const edgesToRemove = face.edgeIds.filter((eid) => !sharedEdgeIds.has(eid));

  let newPlan = { ...plan };
  for (const eid of edgesToRemove) {
    newPlan = removeEdge(newPlan, eid);
  }

  const { [faceId]: _, ...remainingFaces } = newPlan.faces;
  newPlan = { ...newPlan, faces: remainingFaces };

  // Clean orphan vertices
  const usedVertexIds = new Set<string>();
  for (const edge of Object.values(newPlan.edges)) {
    usedVertexIds.add(edge.startId);
    usedVertexIds.add(edge.endId);
  }
  const cleanedVertices: Record<string, Vertex> = {};
  for (const [vid, v] of Object.entries(newPlan.vertices)) {
    if (usedVertexIds.has(vid)) cleanedVertices[vid] = v;
  }

  return { ...newPlan, vertices: cleanedVertices };
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

  let cp = plan;
  const vids: string[] = [];
  const eids: string[] = [];

  for (const pos of positions) {
    const { plan: p, vertexId } = addVertex(cp, pos);
    cp = p;
    vids.push(vertexId);
  }
  for (let i = 0; i < 4; i++) {
    const { plan: p, edgeId } = addEdge(cp, vids[i], vids[(i + 1) % 4]);
    cp = p;
    eids.push(edgeId);
  }

  const newFaceId = Object.keys(cp.faces).find((id) => !plan.faces[id]) ?? null;
  return { plan: cp, vertexIds: vids, edgeIds: eids, faceId: newFaceId };
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
  const hw = totalWidth / 2,
    hh = totalHeight / 2;

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

  let cp = plan;
  const vids: string[] = [];
  const eids: string[] = [];
  for (const pos of positions) {
    const { plan: p, vertexId } = addVertex(cp, pos);
    cp = p;
    vids.push(vertexId);
  }
  for (let i = 0; i < positions.length; i++) {
    const { plan: p, edgeId } = addEdge(
      cp,
      vids[i],
      vids[(i + 1) % positions.length],
    );
    cp = p;
    eids.push(edgeId);
  }
  return { plan: cp, vertexIds: vids, edgeIds: eids };
}

export function createUShape(
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
  const hw = totalWidth / 2,
    hh = totalHeight / 2,
    cw = cutoutWidth / 2;

  const positions: Vec2[] = [
    { x: center.x - hw, y: center.y - hh },
    { x: center.x + hw, y: center.y - hh },
    { x: center.x + hw, y: center.y + hh },
    { x: center.x + cw, y: center.y + hh },
    { x: center.x + cw, y: center.y - hh + (totalHeight - cutoutHeight) },
    { x: center.x - cw, y: center.y - hh + (totalHeight - cutoutHeight) },
    { x: center.x - cw, y: center.y + hh },
    { x: center.x - hw, y: center.y + hh },
  ];

  let cp = plan;
  const vids: string[] = [];
  const eids: string[] = [];
  for (const pos of positions) {
    const { plan: p, vertexId } = addVertex(cp, pos);
    cp = p;
    vids.push(vertexId);
  }
  for (let i = 0; i < positions.length; i++) {
    const { plan: p, edgeId } = addEdge(
      cp,
      vids[i],
      vids[(i + 1) % positions.length],
    );
    cp = p;
    eids.push(edgeId);
  }
  return { plan: cp, vertexIds: vids, edgeIds: eids };
}
