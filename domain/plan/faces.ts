import { Plan, Face, Edge } from "./types";
import { Vec2, sub, cross } from "../geometry/vec2";
import { generateId } from "../../shared/lib/ids";
import { polygonSignedArea } from "../geometry/polygon";

interface AdjacencyEntry {
  vertexId: string;
  edgeId: string;
}

function buildAdjacency(plan: Plan): Map<string, AdjacencyEntry[]> {
  const adj = new Map<string, AdjacencyEntry[]>();

  for (const edge of Object.values(plan.edges)) {
    if (!adj.has(edge.startId)) adj.set(edge.startId, []);
    if (!adj.has(edge.endId)) adj.set(edge.endId, []);

    adj.get(edge.startId)!.push({ vertexId: edge.endId, edgeId: edge.id });
    adj.get(edge.endId)!.push({ vertexId: edge.startId, edgeId: edge.id });
  }

  // Sort neighbors by angle for each vertex
  for (const [vid, neighbors] of adj.entries()) {
    const vPos = plan.vertices[vid]?.position;
    if (!vPos) continue;

    neighbors.sort((a, b) => {
      const posA = plan.vertices[a.vertexId]?.position;
      const posB = plan.vertices[b.vertexId]?.position;
      if (!posA || !posB) return 0;

      const angleA = Math.atan2(posA.y - vPos.y, posA.x - vPos.x);
      const angleB = Math.atan2(posB.y - vPos.y, posB.x - vPos.x);
      return angleA - angleB;
    });
  }

  return adj;
}

export function rebuildFaces(plan: Plan): Plan {
  const adj = buildAdjacency(plan);
  const usedHalfEdges = new Set<string>();
  const faces: Record<string, Face> = {};

  function halfEdgeKey(from: string, to: string): string {
    return `${from}->${to}`;
  }

  function nextHalfEdge(
    fromId: string,
    toId: string,
  ): { nextTo: string; edgeId: string } | null {
    const neighbors = adj.get(toId);
    if (!neighbors || neighbors.length === 0) return null;

    // Find the index where we came from
    const fromIdx = neighbors.findIndex((n) => n.vertexId === fromId);
    if (fromIdx === -1) return null;

    // Next in CW order = previous in sorted (CCW) list
    const nextIdx = (fromIdx - 1 + neighbors.length) % neighbors.length;
    return {
      nextTo: neighbors[nextIdx].vertexId,
      edgeId: neighbors[nextIdx].edgeId,
    };
  }

  // Trace all minimal cycles
  for (const edge of Object.values(plan.edges)) {
    for (const [fromId, toId] of [
      [edge.startId, edge.endId],
      [edge.endId, edge.startId],
    ]) {
      const key = halfEdgeKey(fromId, toId);
      if (usedHalfEdges.has(key)) continue;

      const vertexIds: string[] = [fromId];
      const edgeIds: string[] = [];
      let currentFrom = fromId;
      let currentTo = toId;
      let valid = true;

      // Find the edge for the initial half-edge
      const initialEdge = Object.values(plan.edges).find(
        (e) =>
          (e.startId === fromId && e.endId === toId) ||
          (e.startId === toId && e.endId === fromId),
      );
      if (initialEdge) edgeIds.push(initialEdge.id);

      for (let i = 0; i < 100; i++) {
        const heKey = halfEdgeKey(currentFrom, currentTo);
        usedHalfEdges.add(heKey);

        if (currentTo === fromId && i > 0) {
          // Cycle complete
          break;
        }

        vertexIds.push(currentTo);

        const next = nextHalfEdge(currentFrom, currentTo);
        if (!next) {
          valid = false;
          break;
        }

        edgeIds.push(next.edgeId);
        currentFrom = currentTo;
        currentTo = next.nextTo;

        if (i === 99) {
          valid = false;
        }
      }

      if (!valid || vertexIds.length < 3) continue;

      // Remove duplicate last vertex if same as first
      if (vertexIds[vertexIds.length - 1] === vertexIds[0]) {
        vertexIds.pop();
      }

      // Check if this is a valid face (positive area = CCW = interior face)
      const positions = vertexIds
        .map((vid) => plan.vertices[vid]?.position)
        .filter(Boolean) as Vec2[];

      if (positions.length < 3) continue;

      const area = polygonSignedArea(positions);

      // Only keep faces with positive area (CCW winding = interior)
      if (area > 1e-6) {
        const faceId = generateId("f");
        faces[faceId] = {
          id: faceId,
          edgeIds: [...new Set(edgeIds)],
          vertexIds,
        };
      }
    }
  }

  return { ...plan, faces };
}
