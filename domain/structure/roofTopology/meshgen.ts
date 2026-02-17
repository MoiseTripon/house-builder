import {
  RoofTopology,
  RoofVertex,
  RoofFacet,
  RoofEdge,
  RoofEdgeRole,
} from "./types";
import {
  RoofPlaneGeometry,
  RoofSide,
  faceNormal,
  V3,
  triangleArea3D,
} from "../roofTypes/common";
import { generateId } from "../../../shared/lib/ids";

/**
 * Convert solved RoofTopology into renderable RoofPlaneGeometry[].
 * Each facet becomes one plane. Gable edges generate vertical wall planes.
 */
export function meshFromTopology(
  topo: RoofTopology,
  roofId: string,
): RoofPlaneGeometry[] {
  const planes: RoofPlaneGeometry[] = [];

  // 1. Facet planes (sloped roof surfaces)
  for (const facet of Object.values(topo.facets)) {
    const plane = facetToPlane(facet, topo, roofId);
    if (plane) planes.push(plane);
  }

  // 2. Gable wall planes (vertical triangles under gable edges)
  for (const edge of Object.values(topo.edges)) {
    if (edge.role === "gable") {
      const gablePlane = gableWallPlane(edge, topo, roofId);
      if (gablePlane) planes.push(gablePlane);
    }
  }

  return planes;
}

function facetToPlane(
  facet: RoofFacet,
  topo: RoofTopology,
  roofId: string,
): RoofPlaneGeometry | null {
  const corners: V3[] = [];
  for (const vid of facet.vertexIds) {
    const v = topo.vertices[vid];
    if (!v || v.z === null) return null;
    corners.push([v.position.x, v.position.y, v.z]);
  }
  if (corners.length < 3) return null;

  // Determine which AABB sides this facet touches (for per-edge overhang UI)
  const baseSides = facetBaseSides(facet, topo);

  // Build geometry via fan triangulation
  const verts: number[] = [];
  const norms: number[] = [];
  const idxs: number[] = [];
  const normal = faceNormal(corners[0], corners[1], corners[2]);

  for (const c of corners) {
    verts.push(...c);
    norms.push(...normal);
  }

  for (let i = 1; i < corners.length - 1; i++) {
    idxs.push(0, i, i + 1);
  }

  let area = 0;
  for (let i = 1; i < corners.length - 1; i++) {
    area += triangleArea3D(corners[0], corners[i], corners[i + 1]);
  }

  // Label from edge roles touching this facet
  const label = facetLabel(facet, topo);

  return {
    planeId: `${roofId}_${facet.id}`,
    label,
    vertices: new Float32Array(verts),
    indices: new Uint16Array(idxs),
    normals: new Float32Array(norms),
    area,
    slopeAngleDeg: facet.slopeDeg,
    baseEdgeSides: baseSides,
  };
}

function gableWallPlane(
  edge: RoofEdge,
  topo: RoofTopology,
  roofId: string,
): RoofPlaneGeometry | null {
  const sv = topo.vertices[edge.startId];
  const ev = topo.vertices[edge.endId];
  if (!sv || !ev || sv.z === null || ev.z === null) return null;

  // Only generate if at least one endpoint is above the other
  const minZ = Math.min(sv.z, ev.z);
  const maxZ = Math.max(sv.z, ev.z);
  if (maxZ - minZ < 1) return null;

  // Find the lowest Z among eave neighbors to determine base
  const baseZ = minZ;

  // Build a triangle or quad representing the gable wall
  const corners: V3[] = [
    [sv.position.x, sv.position.y, baseZ],
    [ev.position.x, ev.position.y, baseZ],
    [ev.position.x, ev.position.y, ev.z],
    [sv.position.x, sv.position.y, sv.z],
  ];

  const normal = faceNormal(corners[0], corners[1], corners[2]);
  const verts: number[] = [];
  const norms: number[] = [];
  for (const c of corners) {
    verts.push(...c);
    norms.push(...normal);
  }

  const area =
    triangleArea3D(corners[0], corners[1], corners[2]) +
    triangleArea3D(corners[0], corners[2], corners[3]);

  return {
    planeId: `${roofId}_gable_${edge.id}`,
    label: "Gable Wall",
    vertices: new Float32Array(verts),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
    normals: new Float32Array(norms),
    area,
    slopeAngleDeg: 90,
    baseEdgeSides: [],
  };
}

function facetBaseSides(facet: RoofFacet, topo: RoofTopology): RoofSide[] {
  const sides = new Set<RoofSide>();

  // Check which eave edges belong to this facet
  const vidSet = new Set(facet.vertexIds);
  for (const edge of Object.values(topo.edges)) {
    if (edge.role !== "eave") continue;
    if (vidSet.has(edge.startId) && vidSet.has(edge.endId)) {
      // Determine which side based on edge direction
      const sv = topo.vertices[edge.startId];
      const ev = topo.vertices[edge.endId];
      if (!sv || !ev) continue;

      const dx = Math.abs(ev.position.x - sv.position.x);
      const dy = Math.abs(ev.position.y - sv.position.y);

      if (dx > dy) {
        // Horizontal edge — front or back
        const avgY = (sv.position.y + ev.position.y) / 2;
        const allY = Object.values(topo.vertices).map((v) => v.position.y);
        const midY = (Math.min(...allY) + Math.max(...allY)) / 2;
        sides.add(avgY < midY ? "front" : "back");
      } else {
        // Vertical edge — left or right
        const avgX = (sv.position.x + ev.position.x) / 2;
        const allX = Object.values(topo.vertices).map((v) => v.position.x);
        const midX = (Math.min(...allX) + Math.max(...allX)) / 2;
        sides.add(avgX < midX ? "left" : "right");
      }
    }
  }

  return [...sides];
}

function facetLabel(facet: RoofFacet, topo: RoofTopology): string {
  const vidSet = new Set(facet.vertexIds);
  const touchingRoles = new Set<RoofEdgeRole>();

  for (const e of Object.values(topo.edges)) {
    if (vidSet.has(e.startId) && vidSet.has(e.endId)) {
      touchingRoles.add(e.role);
    }
  }

  if (touchingRoles.has("ridge") && touchingRoles.has("eave")) return "Slope";
  if (touchingRoles.has("hip") && touchingRoles.has("eave")) return "Hip Slope";
  if (touchingRoles.has("valley")) return "Valley Slope";
  if (touchingRoles.has("ridge")) return "Ridge Slope";
  if (touchingRoles.has("hip")) return "Hip Face";
  if (touchingRoles.has("eave")) return "Eave Face";
  return "Roof Face";
}
