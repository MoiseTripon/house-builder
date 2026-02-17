import {
  Vec2,
  midpoint,
  lerp,
  add,
  sub,
  normalize,
  perpCCW,
  scale,
  distance,
} from "../../geometry/vec2";
import { generateId } from "../../../shared/lib/ids";
import {
  RoofTopology,
  RoofVertex,
  RoofEdge,
  RoofFacet,
  RoofEdgeRole,
} from "./types";

/* ================================================================ */
/*  Set edge role                                                     */
/* ================================================================ */

export function setEdgeRole(
  topo: RoofTopology,
  edgeId: string,
  role: RoofEdgeRole,
): RoofTopology {
  const edge = topo.edges[edgeId];
  if (!edge) return topo;
  return {
    ...topo,
    edges: {
      ...topo.edges,
      [edgeId]: { ...edge, role },
    },
  };
}

/* ================================================================ */
/*  Pin / unpin vertex height                                        */
/* ================================================================ */

export function pinVertex(
  topo: RoofTopology,
  vertexId: string,
  z: number,
): RoofTopology {
  const v = topo.vertices[vertexId];
  if (!v) return topo;
  return {
    ...topo,
    vertices: {
      ...topo.vertices,
      [vertexId]: { ...v, pinned: true, pinnedZ: z, z },
    },
  };
}

export function unpinVertex(
  topo: RoofTopology,
  vertexId: string,
): RoofTopology {
  const v = topo.vertices[vertexId];
  if (!v) return topo;
  return {
    ...topo,
    vertices: {
      ...topo.vertices,
      [vertexId]: { ...v, pinned: false },
    },
  };
}

/* ================================================================ */
/*  Add interior vertex                                              */
/* ================================================================ */

/**
 * Adds a free-standing interior vertex at the given position.
 * Does NOT connect edges – use splitFacet or addEdge afterwards.
 */
export function addInteriorVertex(
  topo: RoofTopology,
  position: Vec2,
  z: number | null,
): { topo: RoofTopology; vertexId: string } {
  const id = generateId("rv");
  const v: RoofVertex = {
    id,
    position,
    z,
    pinned: z !== null,
    pinnedZ: z ?? 0,
    isBoundary: false,
  };
  return {
    topo: {
      ...topo,
      vertices: { ...topo.vertices, [id]: v },
    },
    vertexId: id,
  };
}

/* ================================================================ */
/*  Add edge between two vertices                                    */
/* ================================================================ */

export function addEdge(
  topo: RoofTopology,
  startId: string,
  endId: string,
  role: RoofEdgeRole,
): { topo: RoofTopology; edgeId: string } {
  // Don't duplicate
  const existing = Object.values(topo.edges).find(
    (e) =>
      (e.startId === startId && e.endId === endId) ||
      (e.startId === endId && e.endId === startId),
  );
  if (existing) {
    return {
      topo: setEdgeRole(topo, existing.id, role),
      edgeId: existing.id,
    };
  }

  const id = generateId("re");
  const edge: RoofEdge = { id, startId, endId, role };

  const newTopo: RoofTopology = {
    ...topo,
    edges: { ...topo.edges, [id]: edge },
  };

  // Re-split facets that this edge bisects
  return {
    topo: rebuildFacets(newTopo),
    edgeId: id,
  };
}

/* ================================================================ */
/*  Remove edge                                                      */
/* ================================================================ */

export function removeEdge(topo: RoofTopology, edgeId: string): RoofTopology {
  const edge = topo.edges[edgeId];
  if (!edge) return topo;

  // Don't allow removing boundary eave edges
  const sv = topo.vertices[edge.startId];
  const ev = topo.vertices[edge.endId];
  if (sv?.isBoundary && ev?.isBoundary && edge.role === "eave") return topo;

  const { [edgeId]: _, ...remainingEdges } = topo.edges;

  // Remove orphaned interior vertices
  let verts = { ...topo.vertices };
  for (const vid of [edge.startId, edge.endId]) {
    const v = verts[vid];
    if (v && !v.isBoundary) {
      const hasEdges = Object.values(remainingEdges).some(
        (e) => e.startId === vid || e.endId === vid,
      );
      if (!hasEdges) {
        const { [vid]: __, ...rest } = verts;
        verts = rest;
      }
    }
  }

  return rebuildFacets({ ...topo, vertices: verts, edges: remainingEdges });
}

/* ================================================================ */
/*  Split edge at midpoint (or given t ∈ [0,1])                     */
/* ================================================================ */

export function splitEdge(
  topo: RoofTopology,
  edgeId: string,
  t: number = 0.5,
): { topo: RoofTopology; vertexId: string } {
  const edge = topo.edges[edgeId];
  if (!edge) return { topo, vertexId: "" };

  const sv = topo.vertices[edge.startId];
  const ev = topo.vertices[edge.endId];
  if (!sv || !ev) return { topo, vertexId: "" };

  const pos = lerp(sv.position, ev.position, t);
  const z = sv.z !== null && ev.z !== null ? sv.z + (ev.z - sv.z) * t : null;

  const vid = generateId("rv");
  const newVert: RoofVertex = {
    id: vid,
    position: pos,
    z,
    pinned: false,
    pinnedZ: z ?? 0,
    isBoundary: sv.isBoundary && ev.isBoundary,
  };

  // Replace old edge with two new edges
  const { [edgeId]: _, ...edgesWithout } = topo.edges;

  const e1Id = generateId("re");
  const e2Id = generateId("re");
  const newEdges = {
    ...edgesWithout,
    [e1Id]: {
      id: e1Id,
      startId: edge.startId,
      endId: vid,
      role: edge.role,
    } as RoofEdge,
    [e2Id]: {
      id: e2Id,
      startId: vid,
      endId: edge.endId,
      role: edge.role,
    } as RoofEdge,
  };

  const newTopo: RoofTopology = {
    vertices: { ...topo.vertices, [vid]: newVert },
    edges: newEdges,
    facets: topo.facets,
  };

  return { topo: rebuildFacets(newTopo), vertexId: vid };
}

/* ================================================================ */
/*  Add a ridge from the midpoint of one eave to another            */
/* ================================================================ */

export function addRidgeBetweenEdges(
  topo: RoofTopology,
  eaveEdgeId1: string,
  eaveEdgeId2: string,
  ridgeZ: number,
): RoofTopology {
  const e1 = topo.edges[eaveEdgeId1];
  const e2 = topo.edges[eaveEdgeId2];
  if (!e1 || !e2) return topo;

  const s1 = topo.vertices[e1.startId];
  const e1v = topo.vertices[e1.endId];
  const s2 = topo.vertices[e2.startId];
  const e2v = topo.vertices[e2.endId];
  if (!s1 || !e1v || !s2 || !e2v) return topo;

  // Split each eave edge at midpoint → get two new boundary vertices
  let current = topo;
  const { topo: t1, vertexId: v1 } = splitEdge(current, eaveEdgeId1);
  current = t1;

  // Find the edge that corresponds to eaveEdgeId2 after the first split
  // (it might still be the same if they're separate edges)
  const e2Still = current.edges[eaveEdgeId2];
  const e2Target = e2Still
    ? eaveEdgeId2
    : (Object.keys(current.edges).find((eid) => {
        const e = current.edges[eid];
        return (
          (e.startId === e2.startId || e.endId === e2.endId) &&
          eid !== eaveEdgeId1
        );
      }) ?? eaveEdgeId2);

  const { topo: t2, vertexId: v2 } = splitEdge(current, e2Target);
  current = t2;

  // Pin both midpoints at ridgeZ
  current = pinVertex(current, v1, ridgeZ);
  current = pinVertex(current, v2, ridgeZ);

  // Connect them with a ridge edge
  const { topo: t3 } = addEdge(current, v1, v2, "ridge");
  return t3;
}

/* ================================================================ */
/*  Add a hip from a boundary vertex to an interior vertex           */
/* ================================================================ */

export function addHipEdge(
  topo: RoofTopology,
  boundaryVertexId: string,
  interiorVertexId: string,
): RoofTopology {
  const { topo: result } = addEdge(
    topo,
    boundaryVertexId,
    interiorVertexId,
    "hip",
  );
  return result;
}

/* ================================================================ */
/*  Add a valley between two interior or mixed vertices              */
/* ================================================================ */

export function addValleyEdge(
  topo: RoofTopology,
  v1Id: string,
  v2Id: string,
): RoofTopology {
  const { topo: result } = addEdge(topo, v1Id, v2Id, "valley");
  return result;
}

/* ================================================================ */
/*  Mark an edge as gable                                            */
/* ================================================================ */

export function markGable(topo: RoofTopology, edgeId: string): RoofTopology {
  return setEdgeRole(topo, edgeId, "gable");
}

/* ================================================================ */
/*  Move vertex (2D repositioning)                                   */
/* ================================================================ */

export function moveVertex(
  topo: RoofTopology,
  vertexId: string,
  position: Vec2,
): RoofTopology {
  const v = topo.vertices[vertexId];
  if (!v) return topo;
  return {
    ...topo,
    vertices: {
      ...topo.vertices,
      [vertexId]: { ...v, position },
    },
  };
}

/* ================================================================ */
/*  Facet rebuilder — minimal cycle finder over the roof edges       */
/* ================================================================ */

export function rebuildFacets(topo: RoofTopology): RoofTopology {
  const adj = buildAdjacency(topo);
  const usedHalfEdges = new Set<string>();
  const facets: Record<string, RoofFacet> = {};

  for (const edge of Object.values(topo.edges)) {
    for (const [fromId, toId] of [
      [edge.startId, edge.endId],
      [edge.endId, edge.startId],
    ]) {
      const key = `${fromId}->${toId}`;
      if (usedHalfEdges.has(key)) continue;

      const cycle = traceCycle(fromId, toId, adj, usedHalfEdges, topo);
      if (!cycle) continue;

      // Only keep if area > 0 (CCW winding)
      const positions = cycle
        .map((vid) => topo.vertices[vid]?.position)
        .filter(Boolean) as Vec2[];
      if (positions.length < 3) continue;

      const area = signedArea(positions);
      if (area > 1e-6) {
        const fid = generateId("rf");
        facets[fid] = {
          id: fid,
          vertexIds: cycle,
          slopeDeg: 0,
        };
      }
    }
  }

  return { ...topo, facets };
}

/* ---- adjacency ---- */

interface AdjEntry {
  vertexId: string;
  edgeId: string;
}

function buildAdjacency(topo: RoofTopology): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();

  for (const e of Object.values(topo.edges)) {
    if (!adj.has(e.startId)) adj.set(e.startId, []);
    if (!adj.has(e.endId)) adj.set(e.endId, []);
    adj.get(e.startId)!.push({ vertexId: e.endId, edgeId: e.id });
    adj.get(e.endId)!.push({ vertexId: e.startId, edgeId: e.id });
  }

  for (const [vid, neighbors] of adj.entries()) {
    const vPos = topo.vertices[vid]?.position;
    if (!vPos) continue;
    neighbors.sort((a, b) => {
      const pa = topo.vertices[a.vertexId]?.position;
      const pb = topo.vertices[b.vertexId]?.position;
      if (!pa || !pb) return 0;
      return (
        Math.atan2(pa.y - vPos.y, pa.x - vPos.x) -
        Math.atan2(pb.y - vPos.y, pb.x - vPos.x)
      );
    });
  }

  return adj;
}

function traceCycle(
  startFrom: string,
  startTo: string,
  adj: Map<string, AdjEntry[]>,
  used: Set<string>,
  topo: RoofTopology,
): string[] | null {
  const vertexIds: string[] = [startFrom];
  let curFrom = startFrom;
  let curTo = startTo;

  for (let step = 0; step < 200; step++) {
    const heKey = `${curFrom}->${curTo}`;
    used.add(heKey);

    if (curTo === startFrom && step > 0) break;

    vertexIds.push(curTo);

    const neighbors = adj.get(curTo);
    if (!neighbors || neighbors.length === 0) return null;

    const fromIdx = neighbors.findIndex((n) => n.vertexId === curFrom);
    if (fromIdx === -1) return null;

    const nextIdx = (fromIdx - 1 + neighbors.length) % neighbors.length;
    curFrom = curTo;
    curTo = neighbors[nextIdx].vertexId;

    if (step === 199) return null;
  }

  // Remove duplicate last if equals first
  if (
    vertexIds.length > 1 &&
    vertexIds[vertexIds.length - 1] === vertexIds[0]
  ) {
    vertexIds.pop();
  }

  return vertexIds.length >= 3 ? vertexIds : null;
}

function signedArea(positions: Vec2[]): number {
  let area = 0;
  const n = positions.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += positions[i].x * positions[j].y;
    area -= positions[j].x * positions[i].y;
  }
  return area / 2;
}
