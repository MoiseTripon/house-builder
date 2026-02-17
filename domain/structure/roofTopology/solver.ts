import { RoofTopology, RoofVertex, RoofEdge, RoofFacet } from "./types";
import {
  Vec2,
  distance,
  sub,
  normalize,
  dot,
  perpCCW,
  add,
  scale,
} from "../../geometry/vec2";

export interface SolverParams {
  baseZ: number;
  defaultPitchDeg: number;
}

/**
 * Solve vertex heights from edge roles and pitch constraints.
 *
 * Rules:
 *  - Eave vertices stay at baseZ
 *  - Pinned vertices keep their pinnedZ
 *  - Ridge/hip/valley vertex heights are derived from pitch + distance
 *    to the nearest eave edge
 *  - Gable edges: both endpoints stay at baseZ (vertical wall below)
 *
 * This is an iterative constraint solver that converges in a few passes
 * for typical roof shapes.
 */
export function solveHeights(
  topo: RoofTopology,
  params: SolverParams,
): RoofTopology {
  const verts = { ...topo.vertices };
  const pitchRad = (params.defaultPitchDeg * Math.PI) / 180;

  // 1. Lock eave and gable boundary vertices to baseZ
  for (const v of Object.values(verts)) {
    if (v.pinned) {
      verts[v.id] = { ...v, z: v.pinnedZ };
      continue;
    }
    if (v.isBoundary) {
      // Check if ALL edges touching this vertex are eave or gable
      const touchingEdges = Object.values(topo.edges).filter(
        (e) => e.startId === v.id || e.endId === v.id,
      );
      const allBase = touchingEdges.every(
        (e) => e.role === "eave" || e.role === "gable",
      );
      if (allBase) {
        verts[v.id] = { ...v, z: params.baseZ };
        continue;
      }
    }
    // Mark as needing solve
    verts[v.id] = { ...v, z: null };
  }

  // Collect eave edges for distance computation
  const eaveEdges: { start: Vec2; end: Vec2 }[] = [];
  for (const e of Object.values(topo.edges)) {
    if (e.role === "eave" || e.role === "gable") {
      const sv = verts[e.startId];
      const ev = verts[e.endId];
      if (sv && ev) {
        eaveEdges.push({ start: sv.position, end: ev.position });
      }
    }
  }

  // 2. Iterative solve for unsolved vertices
  const MAX_ITER = 10;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = false;

    for (const v of Object.values(verts)) {
      if (v.z !== null) continue;

      // Compute height from pitch + distance to nearest eave
      const dist = minDistToEaves(v.position, eaveEdges);
      const h = dist * Math.tan(pitchRad);
      const newZ = params.baseZ + h;

      // Check if connected to any vertex with known height
      // and average with neighbour-derived heights
      const neighbors = getNeighborVertices(v.id, topo.edges, verts);
      const knownNeighbors = neighbors.filter((n) => n.z !== null);

      let finalZ: number;
      if (knownNeighbors.length > 0) {
        // Blend: pitch-derived height weighted with neighbor average
        const neighborAvg =
          knownNeighbors.reduce((s, n) => s + n.z!, 0) / knownNeighbors.length;
        finalZ = newZ * 0.7 + neighborAvg * 0.3;
      } else {
        finalZ = newZ;
      }

      verts[v.id] = { ...v, z: finalZ };
      changed = true;
    }

    if (!changed) break;
  }

  // 3. Ensure any still-null get baseZ
  for (const v of Object.values(verts)) {
    if (v.z === null) {
      verts[v.id] = { ...v, z: params.baseZ };
    }
  }

  // 4. Compute facet slopes
  const facets = { ...topo.facets };
  for (const f of Object.values(facets)) {
    facets[f.id] = { ...f, slopeDeg: computeFacetSlope(f, verts) };
  }

  return { ...topo, vertices: verts, facets };
}

/* ---- helpers ---- */

function minDistToEaves(
  pos: Vec2,
  eaveEdges: { start: Vec2; end: Vec2 }[],
): number {
  let minD = Infinity;
  for (const e of eaveEdges) {
    const d = distToSegment(pos, e.start, e.end);
    if (d < minD) minD = d;
  }
  return minD === Infinity ? 0 : minD;
}

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const ap = sub(p, a);
  const lenSq = ab.x * ab.x + ab.y * ab.y;
  if (lenSq < 1e-10) return distance(p, a);
  let t = (ap.x * ab.x + ap.y * ab.y) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return distance(p, proj);
}

function getNeighborVertices(
  vid: string,
  edges: Record<string, RoofEdge>,
  verts: Record<string, RoofVertex>,
): RoofVertex[] {
  const result: RoofVertex[] = [];
  for (const e of Object.values(edges)) {
    if (e.startId === vid) {
      const v = verts[e.endId];
      if (v) result.push(v);
    } else if (e.endId === vid) {
      const v = verts[e.startId];
      if (v) result.push(v);
    }
  }
  return result;
}

function computeFacetSlope(
  facet: RoofFacet,
  verts: Record<string, RoofVertex>,
): number {
  if (facet.vertexIds.length < 3) return 0;

  // Fit a plane through the facet vertices, extract slope
  const pts: { x: number; y: number; z: number }[] = [];
  for (const vid of facet.vertexIds) {
    const v = verts[vid];
    if (v && v.z !== null)
      pts.push({ x: v.position.x, y: v.position.y, z: v.z });
  }
  if (pts.length < 3) return 0;

  // Normal via cross product of first two edges
  const e1 = {
    x: pts[1].x - pts[0].x,
    y: pts[1].y - pts[0].y,
    z: pts[1].z - pts[0].z,
  };
  const e2 = {
    x: pts[2].x - pts[0].x,
    y: pts[2].y - pts[0].y,
    z: pts[2].z - pts[0].z,
  };
  const nx = e1.y * e2.z - e1.z * e2.y;
  const ny = e1.z * e2.x - e1.x * e2.z;
  const nz = e1.x * e2.y - e1.y * e2.x;

  const hLen = Math.sqrt(nx * nx + ny * ny);
  if (hLen < 1e-10 && Math.abs(nz) < 1e-10) return 0;

  // Angle between normal and vertical
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  const cosAngle = Math.abs(nz) / len;
  return (Math.acos(Math.min(1, cosAngle)) * 180) / Math.PI;
}
