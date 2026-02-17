import { Vec2 } from "../../geometry/vec2";
import { generateId } from "../../../shared/lib/ids";
import { RoofTopology, RoofVertex, RoofEdge, RoofFacet } from "./types";

/**
 * Initialize a flat roof topology from a plan-face polygon.
 * All edges are eaves, all vertices sit at baseZ, one facet.
 */
export function initializeFromPolygon(
  polygon: Vec2[],
  baseZ: number,
): RoofTopology {
  if (polygon.length < 3) {
    return { vertices: {}, edges: {}, facets: {} };
  }

  const vertices: Record<string, RoofVertex> = {};
  const edges: Record<string, RoofEdge> = {};
  const vIds: string[] = [];

  for (const pos of polygon) {
    const id = generateId("rv");
    vertices[id] = {
      id,
      position: { x: pos.x, y: pos.y },
      z: baseZ,
      pinned: false,
      pinnedZ: baseZ,
      isBoundary: true,
    };
    vIds.push(id);
  }

  const eIds: string[] = [];
  for (let i = 0; i < vIds.length; i++) {
    const j = (i + 1) % vIds.length;
    const eid = generateId("re");
    edges[eid] = {
      id: eid,
      startId: vIds[i],
      endId: vIds[j],
      role: "eave",
    };
    eIds.push(eid);
  }

  const fid = generateId("rf");
  const facets: Record<string, RoofFacet> = {
    [fid]: {
      id: fid,
      vertexIds: [...vIds],
      slopeDeg: 0,
    },
  };

  return { vertices, edges, facets };
}
