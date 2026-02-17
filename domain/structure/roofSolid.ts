import { Vec2 } from "../geometry/vec2";
import { RoofType } from "./roofSystem";
import { generateGableRoof, RoofGeometry } from "./roofTypes/gable";

export interface RoofSolid {
  roofId: string;
  faceId: string;
  roofType: RoofType;
  vertices: Float32Array;
  indices: Uint16Array;
  normals: Float32Array;
  ridgeHeight: number; // height above baseZ
}

/**
 * Generate the 3-D solid for one roof piece.
 */
export function generateRoofSolid(
  roofId: string,
  faceId: string,
  polygon: Vec2[],
  roofType: RoofType,
  baseZ: number,
  pitchDeg: number,
  overhang: number,
): RoofSolid {
  let geometry: RoofGeometry;
  let ridgeHeight = 0;

  switch (roofType) {
    case "gable": {
      geometry = generateGableRoof(polygon, baseZ, pitchDeg, overhang);

      // Compute ridge height for metadata
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const p of polygon) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      const span = Math.min(maxX - minX, maxY - minY);
      ridgeHeight = (span / 2) * Math.tan((pitchDeg * Math.PI) / 180);
      break;
    }
    case "flat":
    default:
      geometry = generateFlatRoof(polygon, baseZ);
      break;
  }

  return {
    roofId,
    faceId,
    roofType,
    vertices: geometry.vertices,
    indices: geometry.indices,
    normals: geometry.normals,
    ridgeHeight,
  };
}

/* ---- flat roof: simple fan triangulation at baseZ ---- */

function generateFlatRoof(polygon: Vec2[], baseZ: number): RoofGeometry {
  if (polygon.length < 3) {
    return {
      vertices: new Float32Array(0),
      indices: new Uint16Array(0),
      normals: new Float32Array(0),
    };
  }

  const verts: number[] = [];
  const norms: number[] = [];
  const idxs: number[] = [];

  for (const p of polygon) {
    verts.push(p.x, p.y, baseZ);
    norms.push(0, 0, 1);
  }

  // Fan triangulation from vertex 0
  for (let i = 1; i < polygon.length - 1; i++) {
    idxs.push(0, i, i + 1);
  }

  return {
    vertices: new Float32Array(verts),
    indices: new Uint16Array(idxs),
    normals: new Float32Array(norms),
  };
}
